# app/services/deck_service.py
# -----------------------------------------------------------------------------
# SERVICIO DE DOMINIO: GESTIÓN Y CICLO DE VIDA DE MAZOS
# -----------------------------------------------------------------------------
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.deck import Deck, DeckCard
from app.models.card import CartaScryfall
from app.schemas.deck import DeckCreate, AddCardToDeckPayload


class DeckService:
    """
    Servicio de Dominio encargado de la orquestación y ciclo de vida de los Mazos.
    Asegura los invariantes del agregado Deck y cuotas de usuario.
    """

    MAX_DECKS_PER_USER: int = 10

    @classmethod
    def get_user_decks(cls, db: Session, user_id: str) -> List[Deck]:
        return db.query(Deck).filter(Deck.user_id == user_id).all()

    @classmethod
    def get_deck_or_fail(cls, db: Session, deck_id: str, user_id: Optional[str] = None) -> Deck:
        query = db.query(Deck).filter(Deck.id == deck_id)
        if user_id is not None:
            query = query.filter(Deck.user_id == user_id)
        
        deck = query.first()
        if not deck:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mazo no encontrado o sin autorización suficiente."
            )
        return deck

    @classmethod
    def create_deck(cls, db: Session, user_id: str, payload: DeckCreate) -> Deck:
        current_count = db.query(Deck).filter(Deck.user_id == user_id).count()
        if current_count >= cls.MAX_DECKS_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Has alcanzado el límite máximo de {cls.MAX_DECKS_PER_USER} mazos registrados."
            )

        new_deck = Deck(
            user_id=user_id,
            name=payload.name,
            format=getattr(payload, "format", "Commander") or "Commander",
            description=getattr(payload, "description", None)
        )
        db.add(new_deck)
        db.commit()
        db.refresh(new_deck)
        return new_deck

    @classmethod
    def delete_deck(cls, db: Session, deck_id: str, user_id: str) -> None:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        db.delete(deck)
        db.commit()

    @classmethod
    def add_card_to_deck(cls, db: Session, deck_id: str, user_id: str, payload: AddCardToDeckPayload) -> DeckCard:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)

        card_id = (
            getattr(payload, "scryfall_card_id", None) 
            or getattr(payload, "card_id", None)
        )
        if not card_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Identificador de carta no proporcionado."
            )

        card_catalog = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
        if not card_catalog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La carta no existe en el catálogo Scryfall."
            )

        try:
            deck_card = deck.add_card(
                scryfall_card_id=card_id,
                quantity=payload.quantity,
                category=getattr(payload, "category", "mainboard") or "mainboard",
                card_catalog=card_catalog
            )
            if deck_card.category == "commander" and not deck.featured_card_id:
                deck.set_featured_card(deck_card.scryfall_card_id)

            db.commit()
            db.refresh(deck_card)
            return deck_card
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def bulk_add_cards(cls, db: Session, deck_id: str, user_id: str, cards_data: List[Any]) -> Dict[str, Any]:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)

        added_count: int = 0
        failed_card_ids: List[str] = []

        for item in cards_data:
            scryfall_id = getattr(item, "scryfall_card_id", None) or getattr(item, "card_id", None)
            if not scryfall_id and isinstance(item, dict):
                scryfall_id = item.get("scryfall_card_id") or item.get("card_id")

            quantity = getattr(item, "quantity", 1) if not isinstance(item, dict) else item.get("quantity", 1)
            category = getattr(item, "category", "mainboard") if not isinstance(item, dict) else item.get("category", "mainboard")

            if not scryfall_id:
                continue

            card_catalog = db.query(CartaScryfall).filter(CartaScryfall.id == scryfall_id).first()
            if not card_catalog:
                failed_card_ids.append(scryfall_id)
                continue

            try:
                deck.add_card(
                    scryfall_card_id=scryfall_id,
                    quantity=quantity,
                    category=category,
                    card_catalog=card_catalog
                )
                added_count += 1
            except Exception:
                failed_card_ids.append(scryfall_id)

        db.commit()
        return {
            "added_count": added_count,
            "failed_card_ids": failed_card_ids
        }

    @classmethod
    def update_deck_card(
        cls,
        db: Session,
        deck_id: str,
        card_id: str,
        user_id: str,
        quantity: Optional[int],
        category: Optional[str]
    ) -> DeckCard:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        deck_card = next((c for c in deck.cards if c.id == card_id), None)
        if not deck_card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carta no encontrada en el mazo."
            )

        try:
            if quantity is not None:
                deck_card.change_quantity(quantity)
            if category is not None:
                deck_card.change_category(category)
            db.commit()
            db.refresh(deck_card)
            return deck_card
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def remove_card_from_deck(cls, db: Session, deck_id: str, card_id: str, user_id: str) -> None:
        deck = cls.get_deck_or_fail(db, deck_id=deck_id, user_id=user_id)
        try:
            deck.remove_card(card_id)
            db.commit()
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))

    @classmethod
    def fork_deck(cls, db: Session, deck_id: str, current_user_id: str, new_name: Optional[str] = None) -> Deck:
        current_count = db.query(Deck).filter(Deck.user_id == current_user_id).count()
        if current_count >= cls.MAX_DECKS_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Has alcanzado el límite máximo de {cls.MAX_DECKS_PER_USER} mazos registrados para duplicar este mazo."
            )

        source_deck = cls.get_deck_or_fail(db, deck_id=deck_id)
        forked = source_deck.fork(new_user_id=current_user_id, new_name=new_name)
        db.add(forked)
        db.commit()
        db.refresh(forked)
        return forked