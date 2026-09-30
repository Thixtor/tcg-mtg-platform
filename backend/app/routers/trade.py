# ---------------------------------------------------------
# ROUTER: MERCADO DE INTERCAMBIO Y MATCHMAKING P2P (MTG)
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, joinedload, contains_eager

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, UserCard, Collection
from app.schemas.trade import TradeMarketItemResponse, TradeMatchUserResponse
from app.services.matchmaking_service import find_trade_matches_for_user

router = APIRouter(
    prefix="/trade",
    tags=["Mercado de Intercambio y Matchmaking"]
)


# ---------------------------------------------------------
# 1. MERCADO PÚBLICO DE CARTAS EN TRADE
# ---------------------------------------------------------
@router.get(
    "/market",
    response_model=List[TradeMarketItemResponse],
    summary="Listar cartas para intercambio de binders públicos"
)
def get_trade_market(
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    items_trade = (
        db.query(UserCard)
        .join(UserCard.collection)
        .join(Collection.owner)
        .options(
            joinedload(UserCard.card_catalog),
            contains_eager(UserCard.collection).contains_eager(Collection.owner)
        )
        .filter(
            UserCard.is_for_trade.is_(True),
            Collection.is_public_trade.is_(True)
        )
        .order_by(UserCard.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    respuesta = []
    for item in items_trade:
        respuesta.append(
            TradeMarketItemResponse(
                user_card_id=item.id,
                card_name=item.card_catalog.name if item.card_catalog else "Carta",
                set_code=item.card_catalog.set if item.card_catalog else None,
                image_url=item.card_catalog.image_url if item.card_catalog else None,
                condition=item.condition,
                language=item.language,
                is_foil=item.is_foil,
                trade_notes=item.trade_notes,
                owner_username=item.collection.owner.username,
                owner_reputation=item.collection.owner.reputation_score or 100
            )
        )
    return respuesta


# ---------------------------------------------------------
# 2. MOTOR DE COINCIDENCIAS (MATCHMAKING INTELIGENTE)
# ---------------------------------------------------------
@router.get(
    "/matches",
    response_model=List[TradeMatchUserResponse],
    summary="Obtener usuarios coincidentes para intercambio (Wishlist vs Trade)"
)
def get_my_trade_matches(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return find_trade_matches_for_user(db, user_id=str(current_user.id), limit=limit)