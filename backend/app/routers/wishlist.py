from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

# Dependencias internas del núcleo
from app.database import get_db
from app.models import User, WishlistItem, UserCard, Collection, CartaScryfall
from app.schemas import (
    WishlistAddPayload,
    WishlistItemResponse,
    TradeMatchUserResponse,
    MatchedCard
)

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
# 2. MOTOR DE MATCHMAKING DE INTERCAMBIOS
# ---------------------------------------------------------
@router.get(
    "/matchmaking/{user_id}",
    response_model=List[TradeMatchUserResponse],
    summary="Encontrar coincidencias de intercambio para un usuario",
    description="Cruza la Wishlist del usuario con cartas disponibles para trade de otros usuarios y detecta coincidencias mutuas."
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

    # 1. Obtener los IDs de cartas que el usuario busca (su wishlist)
    mi_wishlist = db.query(WishlistItem.scryfall_card_id).filter(WishlistItem.user_id == user_id).all()
    mis_deseos_ids = {w[0] for w in mi_wishlist}

    if not mis_deseos_ids:
        return []

    # 2. Obtener las cartas que el usuario tiene para intercambio
    mis_cartas_trade = (
        db.query(UserCard.scryfall_card_id)
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id, UserCard.is_for_trade == True)
        .all()
    )
    mis_trade_ids = {c[0] for c in mis_cartas_trade}

    # 3. Buscar otros usuarios que tengan cartas que yo deseo en estado is_for_trade
    otros_con_mis_deseos = (
        db.query(UserCard, User)
        .join(Collection, UserCard.collection_id == Collection.id)
        .join(User, Collection.user_id == User.id)
        .filter(
            User.id != user_id,
            UserCard.is_for_trade == True,
            UserCard.scryfall_card_id.in_(mis_deseos_ids)
        )
        .all()
    )

    # Agrupar coincidencias por usuario contraparte
    usuarios_coincidentes = {}
    for user_card, otro_usuario in otros_con_mis_deseos:
        if otro_usuario.id not in usuarios_coincidentes:
            usuarios_coincidentes[otro_usuario.id] = {
                "user": otro_usuario,
                "they_have": []
            }
        carta_cat = user_card.card_catalog
        usuarios_coincidentes[otro_usuario.id]["they_have"].append(
            MatchedCard(
                scryfall_card_id=user_card.scryfall_card_id,
                card_name=carta_cat.name if carta_cat else "Carta",
                image_url=carta_cat.image_url if carta_cat else None,
                condition=user_card.condition,
                is_foil=user_card.is_foil
            )
        )

    # 4. Comprobar si hay match mutuo (si el otro usuario busca algo de lo que yo ofrezco)
    resultados: List[TradeMatchUserResponse] = []
    for otro_id, data in usuarios_coincidentes.items():
        otro_user = data["user"]

        they_want_records = (
            db.query(WishlistItem)
            .filter(
                WishlistItem.user_id == otro_id,
                WishlistItem.scryfall_card_id.in_(mis_trade_ids)
            )
            .all()
        )

        they_want_cards = []
        for wl in they_want_records:
            carta_cat = wl.card_catalog
            they_want_cards.append(
                MatchedCard(
                    scryfall_card_id=wl.scryfall_card_id,
                    card_name=carta_cat.name if carta_cat else "Carta",
                    image_url=carta_cat.image_url if carta_cat else None
                )
            )

        is_mutual = len(they_want_cards) > 0

        resultados.append(
            TradeMatchUserResponse(
                user_id=otro_user.id,
                username=otro_user.username,
                phone_number=otro_user.phone_number,
                reputation_score=otro_user.reputation_score,
                they_have=data["they_have"],
                they_want=they_want_cards,
                is_mutual_match=is_mutual
            )
        )

    # Priorizar en la lista los matches mutuos (primero los intercambios bidireccionales)
    resultados.sort(key=lambda r: r.is_mutual_match, reverse=True)
    return resultados