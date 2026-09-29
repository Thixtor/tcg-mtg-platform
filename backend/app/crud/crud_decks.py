# ---------------------------------------------------------
# CAPA CRUD: GESTIÓN DE MAZOS Y CARTAS ASIGNADAS (DECKBUILDER)
# ---------------------------------------------------------
from typing import List, Optional
from sqlalchemy.orm import Session

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
    existing_card = (
        db.query(DeckCard)
        .filter(
            DeckCard.deck_id == deck_id,
            DeckCard.scryfall_card_id == payload.scryfall_card_id,
            DeckCard.category == payload.category
        )
        .first()
    )

    if existing_card:
        existing_card.quantity += payload.quantity
        db.commit()
        db.refresh(existing_card)
        return existing_card

    new_card = DeckCard(
        deck_id=deck_id,
        scryfall_card_id=payload.scryfall_card_id,
        quantity=payload.quantity,
        category=payload.category
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


def bulk_add_cards_to_deck(
    db: Session,
    deck_id: str,
    cards_payload: List[AddCardToDeckPayload]
) -> dict:
    added_count = 0
    failed_card_ids = []

    for item in cards_payload:
        savepoint = db.begin_nested()
        try:
            # 1. Verificar si la carta existe en el catálogo local
            carta = db.query(CartaScryfall).filter(CartaScryfall.id == item.scryfall_card_id).first()
            if not carta:
                savepoint.rollback()
                failed_card_ids.append(item.scryfall_card_id)
                continue

            # 2. Verificar existencia en el mazo
            existing_card = (
                db.query(DeckCard)
                .filter(
                    DeckCard.deck_id == deck_id,
                    DeckCard.scryfall_card_id == item.scryfall_card_id,
                    DeckCard.category == item.category
                )
                .first()
            )

            if existing_card:
                existing_card.quantity += item.quantity
            else:
                new_card = DeckCard(
                    deck_id=deck_id,
                    scryfall_card_id=item.scryfall_card_id,
                    quantity=item.quantity,
                    category=item.category
                )
                db.add(new_card)

            savepoint.commit()
            added_count += 1
        except Exception:
            savepoint.rollback()
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
    if quantity is not None:
        deck_card.quantity = quantity
    if category is not None:
        deck_card.category = category
    db.commit()
    db.refresh(deck_card)
    return deck_card


def remove_card_from_deck(db: Session, deck_card: DeckCard) -> None:
    db.delete(deck_card)
    db.commit()