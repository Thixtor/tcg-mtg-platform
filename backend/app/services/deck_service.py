# app/services/deck_service.py
# -----------------------------------------------------------------------------
# SERVICIO DE DOMINIO: GESTIÓN Y PERSISTENCIA DE MAZOS (MTG)
# -----------------------------------------------------------------------------
import uuid
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, selectinload, joinedload
from fastapi import HTTPException, status

from app.models.deck import Deck, DeckCard
from app.models.card import CartaScryfall
from app.schemas.deck import DeckCreate, AddCardToDeckPayload
from app.services.scryfall_service import ScryfallService

logger = logging.getLogger("deck_service")


class DeckService:

    @classmethod
    def get_deck_or_fail(cls, db: Session, deck_id: str, user_id: Optional[str] = None) -> Deck:
        query = (
            db.query(Deck)
            .options(
                selectinload(Deck.cards).joinedload(DeckCard.card_catalog)
            )
            .filter(Deck.id == deck_id)
        )
        if user_id:
            query = query.filter(Deck.user_id == user_id)

        deck = query.first()
        if not deck:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mazo con ID '{deck_id}' no encontrado o no pertenece al usuario."
            )
        return deck

    @classmethod
    def get_user_decks(cls, db: Session, user_id: str) -> List[Deck]:
        return (
            db.query(Deck)
            .options(
                selectinload(Deck.cards).joinedload(DeckCard.card_catalog)
            )
            .filter(Deck.user_id == user_id)
            .all()
        )

    @classmethod
    def create_deck(cls, db: Session, user_id: str, payload: DeckCreate) -> Deck:
        """Crea un nuevo mazo y asegura la asignación inicial del comandante."""
        try:
            deck = Deck(
                id=str(uuid.uuid4()),
                user_id=user_id,
                name=payload.name.strip(),
                format=payload.format or "Commander",
                description=payload.description
            )
            db.add(deck)
            db.flush()

            # Si viene comandante asignado en el payload (por id o en cards iniciales)
            commander_id = getattr(payload, "commander_id", None) or getattr(payload, "featured_card_id", None)
            
            if commander_id:
                cls._ensure_card_in_catalog(db, commander_id)
                deck.add_card(
                    scryfall_card_id=str(commander_id),
                    quantity=1,
                    category="commander"
                )
                deck.set_featured_card(str(commander_id))

            # Procesar cartas iniciales si las hay
            initial_cards = getattr(payload, "cards", []) or []
            for item in initial_cards:
                c_id = getattr(item, "scryfall_card_id", None) or getattr(item, "card_id", None)
                if not c_id:
                    continue
                cls._ensure_card_in_catalog(db, str(c_id))
                qty = getattr(item, "quantity", 1) or 1
                cat = getattr(item, "category", "mainboard") or "mainboard"
                deck.add_card(scryfall_card_id=str(c_id), quantity=qty, category=cat)

            db.commit()
            return cls.get_deck_or_fail(db, deck_id=deck.id)

        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            logger.error(f"Error al crear el mazo: {exc}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno al guardar el mazo: {str(exc)}"
            )

    @classmethod
    def add_card_to_deck(
        cls,
        db: Session,
        deck_id: str,
        user_id: str,
        payload: AddCardToDeckPayload
    ) -> DeckCard:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        card_id = payload.scryfall_card_id or getattr(payload, "card_id", None)
        if not card_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere scryfall_card_id."
            )

        catalog_card = cls._ensure_card_in_catalog(db, str(card_id))
        
        try:
            deck_card = deck.add_card(
                scryfall_card_id=str(card_id),
                quantity=payload.quantity,
                category=payload.category,
                card_catalog=catalog_card
            )
            db.commit()
            db.refresh(deck_card)
            return deck_card
        except ValueError as val_err:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
        except Exception as exc:
            db.rollback()
            logger.error(f"Error agregando carta al mazo: {exc}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo agregar la carta al mazo."
            )

    @classmethod
    def bulk_add_cards(
        cls,
        db: Session,
        deck_id: str,
        user_id: str,
        cards_data: List[Any]
    ) -> Dict[str, Any]:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        added_count = 0
        failed_card_ids = []

        for item in cards_data:
            c_id = getattr(item, "scryfall_card_id", None) or getattr(item, "card_id", None)
            if not c_id:
                continue
            try:
                catalog_card = cls._ensure_card_in_catalog(db, str(c_id))
                qty = getattr(item, "quantity", 1) or 1
                cat = getattr(item, "category", "mainboard") or "mainboard"
                deck.add_card(
                    scryfall_card_id=str(c_id),
                    quantity=qty,
                    category=cat,
                    card_catalog=catalog_card
                )
                added_count += 1
            except Exception:
                failed_card_ids.append(str(c_id))

        db.commit()
        return {"added_count": added_count, "failed_card_ids": failed_card_ids}

    @classmethod
    def update_deck_card(
        cls,
        db: Session,
        deck_id: str,
        card_id: str,
        user_id: str,
        quantity: Optional[int] = None,
        category: Optional[str] = None
    ) -> DeckCard:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        deck_card = (
            db.query(DeckCard)
            .filter(DeckCard.deck_id == deck.id, DeckCard.id == card_id)
            .first()
        )
        if not deck_card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carta no encontrada en el mazo especificado."
            )

        if quantity is not None:
            deck_card.change_quantity(quantity)
        if category is not None:
            deck_card.change_category(category)

        db.commit()
        db.refresh(deck_card)
        return deck_card

    @classmethod
    def remove_card_from_deck(cls, db: Session, deck_id: str, card_id: str, user_id: str) -> None:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        target = db.query(DeckCard).filter(DeckCard.deck_id == deck.id, DeckCard.id == card_id).first()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta no encontrada en el mazo.")
        db.delete(target)
        db.commit()

    @classmethod
    def delete_deck(cls, db: Session, deck_id: str, user_id: str) -> None:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        db.delete(deck)
        db.commit()

    @classmethod
    def fork_deck(cls, db: Session, deck_id: str, current_user_id: str, new_name: Optional[str] = None) -> Deck:
        base_deck = cls.get_deck_or_fail(db, deck_id=deck_id)
        forked = base_deck.fork(new_user_id=current_user_id, new_name=new_name)
        db.add(forked)
        db.commit()
        return cls.get_deck_or_fail(db, deck_id=forked.id)

    @staticmethod
    def _ensure_card_in_catalog(db: Session, card_id: str) -> CartaScryfall:
        """Autorrepara e ingresa la carta desde Scryfall si aún no existe en la base de datos local."""
        card = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
        if not card or not card.name or card.name == "Desconocido":
            logger.info(f"Sincronizando carta '{card_id}' desde Scryfall para validación de mazo...")
            repaired = ScryfallService.fetch_and_store_by_id(db, card_id)
            if repaired:
                return repaired
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La carta con ID '{card_id}' no existe en el catálogo ni en Scryfall."
            )
        return card