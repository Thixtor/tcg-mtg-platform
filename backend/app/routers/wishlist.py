from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

# Importación de dependencias del núcleo
from app.database import get_db
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
    "/users/{user_id}/wishlist",
    response_model=WishlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una carta a la lista de deseos"
)
def add_to_wishlist(
    user_id: str,
    payload: WishlistAddPayload,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID '{user_id}' no encontrado."
        )

    carta = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La carta no existe en el catálogo."
        )

    item = WishlistItem(
        user_id=user_id,
        scryfall_card_id=payload.scryfall_card_id,
        quantity=payload.quantity,
        priority=payload.priority
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/users/{user_id}/wishlist",
    response_model=List[WishlistItemResponse],
    summary="Listar la wishlist de un usuario"
)
def get_user_wishlist(
    user_id: str,
    db: Session = Depends(get_db)
):
    return (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.card_catalog))
        .filter(WishlistItem.user_id == user_id)
        .all()
    )


@router.delete(
    "/wishlist/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una carta de la wishlist"
)
def remove_from_wishlist(
    item_id: str,
    db: Session = Depends(get_db)
):
    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ítem de wishlist no encontrado."
        )
    db.delete(item)
    db.commit()
    return None


# ---------------------------------------------------------
# 2. MOTOR DE MATCHMAKING (DELEGADO A SERVICIO)
# ---------------------------------------------------------
@router.get(
    "/matchmaking/{user_id}",
    response_model=List[TradeMatchUserResponse],
    summary="Encontrar coincidencias de intercambio para un usuario",
    description="Cruza la Wishlist del usuario con cartas disponibles de otros usuarios mediante matchmaking_service."
)
def get_trade_matches(
    user_id: str,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    # Delegación limpia a la capa de servicios
    return find_trade_matches_for_user(db, user_id)