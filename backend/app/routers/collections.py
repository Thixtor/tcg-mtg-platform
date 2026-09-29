from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, contains_eager

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, Collection, UserCard, CartaScryfall
from app.crud import crud_collections
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    AddCardToCollectionPayload,
    UserCardResponse,
    TradeMarketItemResponse
)

router = APIRouter(
    tags=["Colecciones y Mercado de Intercambio"]
)


# ---------------------------------------------------------
# 1. GESTIÓN DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
@router.post(
    "/collections",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una colección o binder para el usuario autenticado"
)
@router.post(
    "/collections/me",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False  # Alias para compatibilidad hacia atrás
)
def create_collection(
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if crud_collections.count_user_collections(db, str(current_user.id)) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Has alcanzado el límite máximo permitido de 10 colecciones/binders."
        )

    return crud_collections.create_collection(db, user_id=str(current_user.id), payload=payload)


@router.get(
    "/collections/me",
    response_model=List[CollectionResponse],
    summary="Listar las colecciones del usuario autenticado"
)
def list_my_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud_collections.get_collections_by_user(db, user_id=str(current_user.id), only_public=False)


@router.get(
    "/users/{user_id}/collections",
    response_model=List[CollectionResponse],
    summary="Listar las colecciones públicas de un usuario"
)
def list_user_collections(
    user_id: str,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return crud_collections.get_collections_by_user(db, user_id=user_id, only_public=True)


# ---------------------------------------------------------
# 2. CARTAS DENTRO DE UNA COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
@router.post(
    "/collections/{collection_id}/cards",
    response_model=UserCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una carta física a una colección propia"
)
def add_card_to_collection(
    collection_id: str,
    payload: AddCardToCollectionPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coleccion = crud_collections.get_user_collection(db, collection_id=collection_id, user_id=str(current_user.id))
    if not coleccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colección no encontrada o no tienes permisos sobre ella."
        )

    carta_catalogo = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
    if not carta_catalogo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta '{payload.scryfall_card_id}' no existe en el catálogo Scryfall."
        )

    return crud_collections.add_card_to_collection(db, collection_id=collection_id, payload=payload)


@router.get(
    "/collections/{collection_id}/cards",
    response_model=List[UserCardResponse],
    summary="Listar las cartas contenidas en una colección"
)
def list_cards_in_collection(
    collection_id: str,
    db: Session = Depends(get_db)
):
    coleccion = crud_collections.get_collection_by_id(db, collection_id=collection_id)
    if not coleccion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colección no encontrada.")

    return crud_collections.get_cards_in_collection(db, collection_id=collection_id)


@router.delete(
    "/collections/{collection_id}/cards/{card_id}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar una carta física de una colección propia"
)
def remove_card_from_collection(
    collection_id: str,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coleccion = crud_collections.get_user_collection(db, collection_id=collection_id, user_id=str(current_user.id))
    if not coleccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colección no encontrada o no autorizada."
        )

    carta = crud_collections.get_user_card(db, collection_id=collection_id, card_id=card_id)
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Carta física no encontrada en esta colección."
        )

    crud_collections.remove_card_from_collection(db, carta)
    return {"status": "success", "message": "Carta removida de la colección exitosamente."}


# ---------------------------------------------------------
# 3. MURO PÚBLICO DEL MERCADO (TRADE MARKET)
# ---------------------------------------------------------
@router.get(
    "/trade/market",
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
            Collection.is_public_trade.is_(True)  # Respetar la privacidad del binder
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
                card_name=item.card_catalog.name,
                set_code=item.card_catalog.set,
                image_url=item.card_catalog.image_url,
                condition=item.condition,
                language=item.language,
                is_foil=item.is_foil,
                trade_notes=item.trade_notes,
                owner_username=item.collection.owner.username,
                owner_reputation=item.collection.owner.reputation_score
            )
        )
    return respuesta