# app/crud/crud_decks.py
# ---------------------------------------------------------
# CAPA CRUD: GESTIÓN DE MAZOS Y CARTAS ASIGNADAS (DECKBUILDER)
# ---------------------------------------------------------
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models import Deck, DeckCard, CartaScryfall
from app.schemas.deck import DeckCreate, AddCardToDeckPayload


def count_user_decks(db: Session, user_id: str) -> int:
    return db.query(Deck).filter(Deck.user_id == user_id).count()


def create_deck(db: Session, user_id: str, payload: DeckCreate) -> Deck:
    nuevo_mazo = Deck(
        user_id=user_id,
        name=payload.name,
        format=payload.format,
        description=payload.description
    )
    db.add(nuevo_mazo)
    db.commit()
    db.refresh(nuevo_mazo)
    return nuevo_mazo


def get_user_decks(db: Session, user_id: str) -> List[Deck]:
    return db.query(Deck).filter(Deck.user_id == user_id).all()


def get_deck_by_id(db: Session, deck_id: str) -> Optional[Deck]:
    return db.query(Deck).filter(Deck.id == deck_id).first()


def get_user_deck_by_id(db: Session, deck_id: str, user_id: str) -> Optional[Deck]:
    return db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user_id).first()


def add_or_update_card_in_deck(
    db: Session, 
    deck_id: str, 
    payload: AddCardToDeckPayload
) -> DeckCard:
    """
    Upsert atómico con límite de 99 copias.
    Previene condiciones de carrera por doble clic aprovechando ON CONFLICT en PostgreSQL.
    """
    new_id = str(uuid.uuid4())
    stmt = (
        pg_insert(DeckCard)
        .values(
            id=new_id,
            deck_id=deck_id,
            scryfall_card_id=payload.scryfall_card_id,
            quantity=min(payload.quantity, 99),
            category=payload.category
        )
        .on_conflict_do_update(
            constraint="uq_deck_card_category",
            set_={
                "quantity": func.least(DeckCard.quantity + payload.quantity, 99)
            }
        )
        .returning(DeckCard)
    )
    
    result = db.execute(stmt).scalar_one()
    db.commit()
    return result


def bulk_add_cards_to_deck(
    db: Session,
    deck_id: str,
    cards_payload: List[AddCardToDeckPayload]
) -> Dict[str, Any]:
    """
    Importación masiva atómica y tolerante a fallos.
    Verifica preexistencia en catálogo en una sola consulta para evitar N+1 savepoints.
    """
    if not cards_payload:
        return {"added_count": 0, "failed_card_ids": []}

    # 1. Validación en batch de IDs presentes en catálogo local
    incoming_ids = {item.scryfall_card_id for item in cards_payload}
    catalog_existing = set(
        row[0] for row in db.query(CartaScryfall.id)
        .filter(CartaScryfall.id.in_(incoming_ids))
        .all()
    )

    added_count = 0
    failed_card_ids = []

    # 2. Inserción protegida por fila sin degradar rendimiento
    for item in cards_payload:
        if item.scryfall_card_id not in catalog_existing:
            failed_card_ids.append(item.scryfall_card_id)
            continue

        try:
            stmt = (
                pg_insert(DeckCard)
                .values(
                    id=str(uuid.uuid4()),
                    deck_id=deck_id,
                    scryfall_card_id=item.scryfall_card_id,
                    quantity=min(item.quantity, 99),
                    category=item.category
                )
                .on_conflict_do_update(
                    constraint="uq_deck_card_category",
                    set_={
                        "quantity": func.least(DeckCard.quantity + item.quantity, 99)
                    }
                )
            )
            db.execute(stmt)
            added_count += 1
        except Exception:
            failed_card_ids.append(item.scryfall_card_id)

    db.commit()
    return {
        "added_count": added_count,
        "failed_card_ids": failed_card_ids
    }


def get_deck_card(db: Session, deck_id: str, card_id: str) -> Optional[DeckCard]:
    return (
        db.query(DeckCard)
        .filter(DeckCard.id == card_id, DeckCard.deck_id == deck_id)
        .first()
    )


def update_deck_card(
    db: Session, 
    deck_card: DeckCard, 
    quantity: Optional[int] = None, 
    category: Optional[str] = None
) -> DeckCard:
    """
    Actualiza cantidad o mueve la carta de categoría manejando fusiones si ya existía en la categoría destino.
    """
    if category is not None and category != deck_card.category:
        # Verificar si ya existe una entrada para esta carta en la categoría de destino
        target_card = (
            db.query(DeckCard)
            .filter(
                DeckCard.deck_id == deck_card.deck_id,
                DeckCard.scryfall_card_id == deck_card.scryfall_card_id,
                DeckCard.category == category,
                DeckCard.id != deck_card.id
            )
            .first()
        )
        if target_card:
            # Fusionar cantidades en la tarjeta existente y eliminar la actual
            nueva_cantidad = (quantity if quantity is not None else deck_card.quantity) + target_card.quantity
            target_card.quantity = min(nueva_cantidad, 99)
            db.delete(deck_card)
            db.commit()
            db.refresh(target_card)
            return target_card
        else:
            deck_card.category = category

    if quantity is not None:
        deck_card.quantity = min(quantity, 99)

    db.commit()
    db.refresh(deck_card)
    return deck_card


def remove_card_from_deck(db: Session, deck_card: DeckCard) -> None:
    db.delete(deck_card)
    db.commit()