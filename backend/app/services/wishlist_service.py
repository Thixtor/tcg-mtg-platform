# app/services/wishlist_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: LISTA DE DESEOS (WISHLIST)
# ---------------------------------------------------------
from typing import List
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.wishlist import WishlistItem
from app.models.card import CartaScryfall
from app.schemas import WishlistAddPayload


class WishlistService:
    """
    Servicio de Dominio encargado de orquestar los ítems de búsqueda del usuario.
    """

    @classmethod
    def get_user_wishlist(cls, db: Session, user_id: str) -> List[WishlistItem]:
        return (
            db.query(WishlistItem)
            .options(joinedload(WishlistItem.card_catalog))
            .filter(WishlistItem.user_id == user_id)
            .all()
        )

    @classmethod
    def add_card_to_wishlist(cls, db: Session, user_id: str, payload: WishlistAddPayload) -> WishlistItem:
        card = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La carta '{payload.scryfall_card_id}' no existe en el catálogo."
            )

        existing = (
            db.query(WishlistItem)
            .filter(
                WishlistItem.user_id == user_id,
                WishlistItem.scryfall_card_id == payload.scryfall_card_id
            )
            .first()
        )

        try:
            if existing:
                existing.change_quantity(existing.quantity + getattr(payload, "quantity", 1))
                if hasattr(payload, "priority") and payload.priority:
                    existing.set_priority(payload.priority)
                item = existing
            else:
                item = WishlistItem(
                    user_id=user_id,
                    scryfall_card_id=payload.scryfall_card_id,
                    quantity=getattr(payload, "quantity", 1),
                    priority=getattr(payload, "priority", "media") or "media"
                )
                db.add(item)

            db.commit()
            db.refresh(item)
            return item
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def remove_card_from_wishlist(cls, db: Session, user_id: str, item_id: str) -> None:
        item = (
            db.query(WishlistItem)
            .filter(
                WishlistItem.id == item_id,
                WishlistItem.user_id == user_id
            )
            .first()
        )
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ítem de wishlist no encontrado o no autorizado."
            )

        db.delete(item)
        db.commit()