# app/services/wishlist_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: LISTA DE DESEOS (WISHLIST)
# ---------------------------------------------------------
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from app.models.wishlist import WishlistItem
from app.models.card import CartaScryfall
from app.schemas import WishlistAddPayload


class WishlistService:
    """
    Servicio de Dominio encargado de orquestar los ítems de búsqueda del usuario
    y calcular la demanda comunitaria de cartas.
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

    @classmethod
    def get_most_wanted_cards(
        cls,
        db: Session,
        limit: int = 20,
        color_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calcula el ranking de las cartas más solicitadas según las Wishlists activas.
        Agrupa por carta y ordena por usuarios demandantes únicos y cantidad total.
        """
        query = (
            db.query(
                CartaScryfall.id.label("scryfall_card_id"),
                CartaScryfall.name.label("card_name"),
                CartaScryfall.type_line.label("type_line"),
                CartaScryfall.color_identity.label("color_identity"),
                CartaScryfall.cmc.label("cmc"),
                func.count(func.distinct(WishlistItem.user_id)).label("users_count"),
                func.coalesce(func.sum(WishlistItem.quantity), 0).label("total_copies_wanted"),
            )
            .join(CartaScryfall, WishlistItem.scryfall_card_id == CartaScryfall.id)
            .group_by(CartaScryfall.id)
        )

        if color_filter:
            colors = [c.strip().upper() for c in color_filter.split(",") if c.strip()]
            for color in colors:
                query = query.filter(CartaScryfall.color_identity.ilike(f"%{color}%"))

        if type_filter:
            query = query.filter(CartaScryfall.type_line.ilike(f"%{type_filter.strip()}%"))

        results = (
            query
            .order_by(
                desc("users_count"),
                desc("total_copies_wanted"),
                CartaScryfall.name.asc()
            )
            .limit(limit)
            .all()
        )

        items = [
            {
                "scryfall_card_id": row.scryfall_card_id,
                "card_name": row.card_name,
                "type_line": row.type_line,
                "color_identity": row.color_identity,
                "cmc": row.cmc,
                "users_count": row.users_count,
                "total_copies_wanted": int(row.total_copies_wanted),
            }
            for row in results
        ]

        return {
            "total": len(items),
            "items": items,
        }