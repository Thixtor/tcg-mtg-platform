# app/routers/collections.py
# ---------------------------------------------------------
# ROUTER: GESTIÓN DE COLECCIONES Y BINDERS DE USUARIO (POO / DDD)
# ---------------------------------------------------------
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models import User, Deck
from app.models.collection import Collection, UserCard
from app.models.deck import DeckCard
from app.services.collection_service import CollectionService
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    AddCardToCollectionPayload,
    UserCardResponse,
    UserCardSearchResponse
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
# 2. BÚSQUEDA EN INVENTARIO Y STOCK PROPIO (USER CARDS Y MAZOS)
# ---------------------------------------------------------
@router.get(
    "/collections/cards/my-copies/{scryfall_card_id}",
    summary="Consultar copias físicas en binders y asignación en mazos del usuario"
)
def get_my_card_copies(
    scryfall_card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retorna el conteo y desglose de copias en carpetas físicas (UserCard)
    y su uso en listas de mazos (DeckCard), de forma desacoplada.
    """
    # 1. Copias físicas en Colecciones / Binders
    user_cards = (
        db.query(UserCard, Collection.name.label("collection_name"))
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(
            Collection.user_id == str(current_user.id),
            UserCard.scryfall_card_id == scryfall_card_id
        )
        .all()
    )

    total_collection = sum(uc.quantity for uc, _ in user_cards)
    for_trade_copies = sum(uc.quantity for uc, _ in user_cards if getattr(uc, "is_for_trade", False))

    collection_details = [
        {
            "user_card_id": str(uc.id),
            "collection_id": str(uc.collection_id),
            "collection_name": col_name,
            "quantity": uc.quantity,
            "condition": getattr(uc, "condition", "NM"),
            "is_foil": getattr(uc, "is_foil", False),
            "is_for_trade": getattr(uc, "is_for_trade", False),
        }
        for uc, col_name in user_cards
    ]

    # 2. Copias asignadas en Mazos propios
    deck_cards = (
        db.query(DeckCard, Deck.name.label("deck_name"))
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(
            Deck.user_id == str(current_user.id),
            DeckCard.scryfall_card_id == scryfall_card_id
        )
        .all()
    )

    total_in_decks = sum(dc.quantity for dc, _ in deck_cards)

    deck_details = [
        {
            "deck_card_id": str(dc.id),
            "deck_id": str(dc.deck_id),
            "deck_name": d_name,
            "quantity": dc.quantity,
            "category": getattr(dc, "category", "mainboard"),
        }
        for dc, d_name in deck_cards
    ]

    return {
        "scryfall_card_id": scryfall_card_id,
        "total_collection": total_collection,
        "for_trade_copies": for_trade_copies,
        "collection_details": collection_details,
        "total_in_decks": total_in_decks,
        "deck_details": deck_details
    }


@router.get(
    "/collections/cards/search",
    response_model=UserCardSearchResponse,
    summary="Buscar y filtrar cartas dentro del inventario del usuario"
)
def search_user_inventory(
    q: Optional[str] = Query(None, description="Búsqueda por nombre de carta o tipo"),
    color: Optional[str] = Query(None, description="Filtrar por colores (ej: 'U', 'W,B')"),
    card_type: Optional[str] = Query(None, description="Tipo de carta (ej: 'Creature', 'Instant')"),
    for_trade: Optional[bool] = Query(None, description="Filtrar cartas marcadas para trade"),
    is_foil: Optional[bool] = Query(None, description="Filtrar por acabado foil"),
    condition: Optional[str] = Query(None, description="Condición física (NM, LP, MP, HP, DMG)"),
    collection_id: Optional[str] = Query(None, description="Filtrar por binder/colección específico"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(50, ge=1, le=100, description="Cantidad de cartas por página"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CollectionService.search_user_cards(
        db=db,
        user_id=str(current_user.id),
        query_text=q,
        color_filter=color,
        type_filter=card_type,
        only_for_trade=for_trade,
        is_foil=is_foil,
        condition=condition,
        collection_id=collection_id,
        page=page,
        limit=limit,
    )


# ---------------------------------------------------------
# 3. CARTAS DENTRO DE UNA COLECCIÓN ESPECÍFICA
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