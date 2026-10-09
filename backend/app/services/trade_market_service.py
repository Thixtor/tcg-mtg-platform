# app/services/trade_market_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: MURO DE INTERCAMBIO Y TRADEWALL P2P
# ---------------------------------------------------------
from typing import List
from sqlalchemy.orm import Session, joinedload, contains_eager

from app.models import UserCard, Collection, CartaScryfall
from app.schemas.trade import TradeMarketItemResponse


class TradeMarketService:
    """
    Servicio de Dominio enfocado exclusivamente en la lectura y proyección
    del catálogo comunitario de cartas marcadas para intercambio público.
    """

    @classmethod
    def get_public_trade_items(
        cls,
        db: Session,
        limit: int = 24,
        offset: int = 0
    ) -> List[TradeMarketItemResponse]:
        query = (
            db.query(UserCard)
            .join(UserCard.collection)
            .join(Collection.owner)
            .options(
                joinedload(UserCard.card_catalog),
                contains_eager(UserCard.collection).contains_eager(Collection.owner)
            )
            .filter(
                UserCard.is_for_trade.is_(True),
                UserCard.quantity > 0,
                Collection.is_public_trade.is_(True)
            )
        )

        if hasattr(UserCard, "created_at"):
            query = query.order_by(getattr(UserCard, "created_at").desc())
        else:
            query = query.order_by(UserCard.id.desc())

        items_trade = query.offset(offset).limit(limit).all()

        market_items: List[TradeMarketItemResponse] = []
        for item in items_trade:
            catalog_entry = item.card_catalog
            owner_entry = item.collection.owner

            card_name = getattr(catalog_entry, "name", "Carta") if catalog_entry else "Carta"
            set_code = getattr(catalog_entry, "set", None) if catalog_entry else None
            image_url = getattr(catalog_entry, "image_url", None) if catalog_entry else None

            username = getattr(owner_entry, "username", "Anónimo") if owner_entry else "Anónimo"
            reputation = getattr(owner_entry, "reputation_score", 100) or 100

            market_items.append(
                TradeMarketItemResponse(
                    user_card_id=str(item.id),
                    card_name=card_name,
                    set_code=set_code,
                    image_url=image_url,
                    condition=item.condition,
                    language=item.language,
                    is_foil=item.is_foil,
                    trade_notes=item.trade_notes,
                    owner_username=username,
                    owner_reputation=reputation
                )
            )

        return market_items