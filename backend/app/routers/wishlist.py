from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, WishlistItem, CartaScryfall
from app.schemas import (
    WishlistAddPayload,
    WishlistItemResponse,
    TradeMatchUserResponse
)
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
    carta = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La carta no existe en el catálogo."
        )

    item = WishlistItem(
        user_id=current_user.id,
        scryfall_card_id=payload.scryfall_card_id,
        quantity=payload.quantity,
        priority=payload.priority
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/wishlist/me",
    response_model=List[WishlistItemResponse],
    summary="Listar la wishlist del usuario autenticado"
)
def get_my_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.card_catalog))
        .filter(WishlistItem.user_id == current_user.id)
        .all()
    )


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
    # Verificación de propiedad (Ownership) para evitar IDOR
    item = db.query(WishlistItem).filter(
        WishlistItem.id == item_id,
        WishlistItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ítem de wishlist no encontrado o no autorizado."
        )

    db.delete(item)
    db.commit()
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
    return find_trade_matches_for_user(db, current_user.id)