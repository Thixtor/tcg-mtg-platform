# app/routers/wishlist.py
# ---------------------------------------------------------
# ROUTER: WISHLIST Y MOTOR DE MATCHMAKING (POO / DDD)
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas import (
    WishlistAddPayload,
    WishlistItemResponse,
    TradeMatchUserResponse,
    MostWantedResponse
)
from app.services.wishlist_service import WishlistService
from app.services.matchmaking_service import find_trade_matches_for_user

router = APIRouter(
    tags=["Wishlist y Motor de Matchmaking"]
)


# ---------------------------------------------------------
# 1. RANKING PÚBLICO: CARTAS MÁS BUSCADAS (MOST WANTED)
# ---------------------------------------------------------
@router.get(
    "/wishlist/most-wanted",
    response_model=MostWantedResponse,
    summary="Top de cartas más deseadas y requeridas en wishlists de la comunidad"
)
def get_most_wanted_cards(
    limit: int = Query(20, ge=1, le=100, description="Cantidad máxima de cartas a retornar"),
    color: Optional[str] = Query(None, description="Filtrar por identidad de color (ej: 'U', 'W,B')"),
    card_type: Optional[str] = Query(None, description="Filtrar por tipo de carta (ej: 'Artifact', 'Creature')"),
    db: Session = Depends(get_db)
):
    return WishlistService.get_most_wanted_cards(
        db=db,
        limit=limit,
        color_filter=color,
        type_filter=card_type
    )


# ---------------------------------------------------------
# 2. GESTIÓN DE LA LISTA DE DESEOS (WISHLIST)
# ---------------------------------------------------------
@router.post(
    "/wishlist",
    response_model=WishlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una carta a la lista de deseos propia"
)
def add_to_wishlist(
    payload: WishlistAddPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return WishlistService.add_card_to_wishlist(
        db=db,
        user_id=str(current_user.id),
        payload=payload
    )


@router.get(
    "/wishlist/me",
    response_model=List[WishlistItemResponse],
    summary="Listar la wishlist del usuario autenticado"
)
def get_my_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return WishlistService.get_user_wishlist(db=db, user_id=str(current_user.id))


@router.delete(
    "/wishlist/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una carta de la wishlist verificando propiedad"
)
def remove_from_wishlist(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    WishlistService.remove_card_from_wishlist(
        db=db,
        user_id=str(current_user.id),
        item_id=item_id
    )
    return None


# ---------------------------------------------------------
# 3. MOTOR DE MATCHMAKING
# ---------------------------------------------------------
@router.get(
    "/matchmaking/me",
    response_model=List[TradeMatchUserResponse],
    summary="Encontrar coincidencias de intercambio para el usuario autenticado"
)
def get_trade_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return find_trade_matches_for_user(db=db, user_id=str(current_user.id))