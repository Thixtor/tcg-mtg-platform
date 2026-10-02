# app/routers/wishlist.py
# ---------------------------------------------------------
# ROUTER: WISHLIST Y MOTOR DE MATCHMAKING (POO / DDD)
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas import (
    WishlistAddPayload,
    WishlistItemResponse,
    TradeMatchUserResponse
)
from app.services.wishlist_service import WishlistService
from app.services.matchmaking_service import find_trade_matches_for_user

router = APIRouter(
    tags=["Wishlist y Motor de Matchmaking"]
)


# ---------------------------------------------------------
# 1. GESTIÓN DE LA LISTA DE DESEOS (WISHLIST)
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
# 2. MOTOR DE MATCHMAKING
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