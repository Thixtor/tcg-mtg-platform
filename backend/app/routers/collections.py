# app/routers/collections.py
# ---------------------------------------------------------
# ROUTER: GESTIÓN DE COLECCIONES Y BINDERS DE USUARIO
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, defer

from app.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models import User, Collection, UserCard, CartaScryfall
from app.crud import crud_collections
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    AddCardToCollectionPayload,
    UserCardResponse
)

router = APIRouter(
    tags=["Colecciones y Binders"]
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
    include_in_schema=False
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
    summary="Listar las cartas contenidas en una colección con paginación"
)
def list_cards_in_collection(
    collection_id: str,
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(50, ge=1, le=200, description="Cartas por página"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    coleccion = crud_collections.get_collection_by_id(db, collection_id=collection_id)
    if not coleccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Colección no encontrada."
        )

    # Si el binder es privado, solo el propietario puede consultar su contenido (Anti-enumeración)
    is_public = getattr(coleccion, "is_public_trade", True)
    is_owner = current_user is not None and str(current_user.id) == str(coleccion.user_id)

    if not is_public and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colección no encontrada."
        )

    offset = (page - 1) * page_size
    query = (
        db.query(UserCard)
        .filter(UserCard.collection_id == collection_id)
        .options(joinedload(UserCard.card_catalog).defer(CartaScryfall.scryfall_raw_data))
    )

    # REGLA SQLALCHEMY: order_by DEBE ir antes de offset() y limit()
    if hasattr(UserCard, "created_at"):
        query = query.order_by(UserCard.created_at.desc())
    else:
        query = query.order_by(UserCard.id.desc())

    return query.offset(offset).limit(page_size).all()


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