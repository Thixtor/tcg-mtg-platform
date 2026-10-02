# app/routers/collections.py
# ---------------------------------------------------------
# ROUTER: GESTIÓN DE COLECCIONES Y BINDERS DE USUARIO (POO / DDD)
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models import User
from app.services.collection_service import CollectionService
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
    return CollectionService.create_collection(
        db=db,
        user_id=str(current_user.id),
        payload=payload
    )


@router.get(
    "/collections/me",
    response_model=List[CollectionResponse],
    summary="Listar las colecciones del usuario autenticado"
)
def list_my_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CollectionService.get_user_collections(
        db=db,
        user_id=str(current_user.id),
        only_public=False
    )


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )
    return CollectionService.get_user_collections(
        db=db,
        user_id=user_id,
        only_public=True
    )


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
    return CollectionService.add_card_to_collection(
        db=db,
        collection_id=collection_id,
        user_id=str(current_user.id),
        payload=payload
    )


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
    current_user_id = str(current_user.id) if current_user else None
    return CollectionService.get_paginated_cards(
        db=db,
        collection_id=collection_id,
        current_user_id=current_user_id,
        page=page,
        page_size=page_size
    )


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
    CollectionService.remove_card_from_collection(
        db=db,
        collection_id=collection_id,
        user_id=str(current_user.id),
        card_id=card_id
    )
    return {"status": "success", "message": "Carta removida de la colección exitosamente."}