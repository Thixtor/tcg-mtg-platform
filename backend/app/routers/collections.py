# ============================================================================
# ROUTER: GESTIÓN DE COLECCIONES, BINDERS Y STOCK DE USUARIO (POO / DDD)
# ============================================================================
# ARQUITECTURA & REGLAS DE DOMINIO:
# 1. Pertenencia Multiedición: Si el usuario consulta copias de una impresión,
#    el sistema busca tanto por scryfall_card_id exacto como por nombre canónico
#    en CardCatalog para totalizar todas las copias físicas reales en binders.
# 2. Desacoplamiento de Mazos: La presencia de una carta en mazos digitales
#    (DeckCard) representa asignación/intención de juego, NO posesión física.
#    Tener una misma carta en múltiples mazos no multiplica las copias físicas.
# 3. Actualización Atómica y Flexible: El endpoint PATCH sobre cartas de colección
#    soporta tanto deltas relativos (+1, -1) y cantidades absolutas, como el
#    cambio de estado de trade (is_for_trade), acabados foil y condición física
#    sin disparar excepciones 400.
# 4. Paginación y Filtrado: Consultas eficientes de inventario desacopladas
#    de las dependencias externas del marketplace.
# ============================================================================

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel, Field

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


# ----------------------------------------------------------------------------
# 1. GESTIÓN DE COLECCIONES (BINDERS)
# ----------------------------------------------------------------------------
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


# ----------------------------------------------------------------------------
# 2. BÚSQUEDA EN INVENTARIO Y STOCK PROPIO (USER CARDS Y MAZOS)
# ----------------------------------------------------------------------------
@router.get(
    "/collections/cards/my-copies/{scryfall_card_id}",
    summary="Consultar copias físicas en binders y asignación en mazos del usuario"
)
def get_my_card_copies(
    scryfall_card_id: str,
    card_name: Optional[str] = Query(None, description="Nombre canónico de la carta para cruce multiedición"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retorna el conteo y desglose de copias en carpetas físicas (UserCard)
    y su uso en listas de mazos (DeckCard), de forma desacoplada y multiedición.
    """
    user_id = str(current_user.id)
    scry_id_clean = str(scryfall_card_id).strip()

    # 1. Resolver el nombre canónico si no viene provisto en la query
    canonical_name = card_name.strip().lower() if card_name else None
    if not canonical_name:
        existing_uc = db.query(UserCard).filter(UserCard.scryfall_card_id == scry_id_clean).first()
        if existing_uc:
            cat = getattr(existing_uc, "card_catalog", None)
            c_name = getattr(cat, "name", None) or getattr(existing_uc, "name", None)
            if c_name:
                canonical_name = str(c_name).strip().lower()

    if not canonical_name:
        existing_dc = db.query(DeckCard).filter(DeckCard.scryfall_card_id == scry_id_clean).first()
        if existing_dc:
            cat = getattr(existing_dc, "card_catalog", None)
            c_name = getattr(cat, "name", None) or getattr(existing_dc, "name", None)
            if c_name:
                canonical_name = str(c_name).strip().lower()

    # 2. Copias físicas reales en Colecciones / Binders
    user_cards_query = (
        db.query(UserCard, Collection.name.label("collection_name"))
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id)
    )
    if hasattr(UserCard, "card_catalog"):
        user_cards_query = user_cards_query.options(joinedload(UserCard.card_catalog))

    all_user_cards = user_cards_query.all()

    total_collection = 0
    for_trade_copies = 0
    collection_details: List[Dict[str, Any]] = []

    for uc, col_name in all_user_cards:
        u_scry = str(getattr(uc, "scryfall_card_id", "") or "").strip()
        cat = getattr(uc, "card_catalog", None)
        u_name = str(getattr(cat, "name", None) or getattr(uc, "name", None) or "").strip().lower()

        is_match = (u_scry == scry_id_clean) or (bool(canonical_name) and u_name == canonical_name)

        if is_match:
            qty = int(getattr(uc, "quantity", 1) or 1)
            total_collection += qty
            if getattr(uc, "is_for_trade", False):
                for_trade_copies += qty

            collection_details.append({
                "user_card_id": str(uc.id),
                "collection_id": str(uc.collection_id),
                "collection_name": col_name or "Colección Principal",
                "quantity": qty,
                "condition": getattr(uc, "condition", "NM") or "NM",
                "is_foil": bool(getattr(uc, "is_foil", False)),
                "is_for_trade": bool(getattr(uc, "is_for_trade", False)),
                "scryfall_card_id": u_scry
            })

    # 3. Asignación en Mazos propios del usuario (sin inventar copias físicas)
    deck_cards_query = (
        db.query(DeckCard, Deck.name.label("deck_name"))
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(Deck.user_id == user_id)
    )
    if hasattr(DeckCard, "card_catalog"):
        deck_cards_query = deck_cards_query.options(joinedload(DeckCard.card_catalog))

    all_deck_cards = deck_cards_query.all()

    deck_details: List[Dict[str, Any]] = []
    for dc, d_name in all_deck_cards:
        dc_scry = str(getattr(dc, "scryfall_card_id", "") or "").strip()
        cat = getattr(dc, "card_catalog", None)
        dc_name = str(getattr(cat, "name", None) or getattr(dc, "name", None) or "").strip().lower()

        is_match = (dc_scry == scry_id_clean) or (bool(canonical_name) and dc_name == canonical_name)

        if is_match:
            deck_details.append({
                "deck_card_id": str(dc.id),
                "deck_id": str(dc.deck_id),
                "deck_name": d_name or "Mazo sin nombre",
                "quantity": int(getattr(dc, "quantity", 1) or 1),
                "category": str(getattr(dc, "category", "mainboard") or "mainboard"),
            })

    return {
        "scryfall_card_id": scry_id_clean,
        "canonical_name": canonical_name,
        "total_collection": total_collection,
        "for_trade_copies": for_trade_copies,
        "collection_details": collection_details,
        "total_in_decks": len(deck_details),
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


# ----------------------------------------------------------------------------
# 3. CARTAS DENTRO DE UNA COLECCIÓN ESPECÍFICA
# ----------------------------------------------------------------------------
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


# ----------------------------------------------------------------------------
# 4. ACTUALIZACIÓN DIRECTA DE ATRIBUTOS, ESTADO DE TRADE Y CANTIDADES
# ----------------------------------------------------------------------------
class UpdateUserCardPayload(BaseModel):
    delta: Optional[int] = Field(None, description="Incremento o decremento (+1, -1)")
    quantity: Optional[int] = Field(None, ge=0, description="Nueva cantidad absoluta")
    is_for_trade: Optional[bool] = Field(None, description="Disponibilidad para intercambio")
    is_foil: Optional[bool] = Field(None, description="Acabado foil")
    condition: Optional[str] = Field(None, description="Condición física (NM, LP, MP, HP, DMG)")
    trade_notes: Optional[str] = Field(None, description="Notas para el trade")


@router.patch(
    "/collections/{collection_id}/cards/{card_id}",
    response_model=UserCardResponse,
    summary="Ajustar cantidad, trade o atributos de una carta en la colección"
)
def update_card_in_collection(
    collection_id: str,
    card_id: str,
    payload: UpdateUserCardPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite sumar o restar copias fácilmente con un solo clic, así como alternar
    el flag is_for_trade, foil o condición sin requerir delta/quantity obligatorios.
    Si la cantidad llega a 0, se elimina la carta de la colección.
    """
    user_card = (
        db.query(UserCard)
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == str(current_user.id),
            UserCard.id == card_id
        )
        .first()
    )

    if not user_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Carta no encontrada en la colección especificada."
        )

    # 1. Ajuste de cantidad (solo si viene delta o quantity especificado)
    if payload.delta is not None or payload.quantity is not None:
        current_qty = int(getattr(user_card, "quantity", 1) or 1)
        new_qty = current_qty + payload.delta if payload.delta is not None else payload.quantity

        if new_qty <= 0:
            db.delete(user_card)
            db.commit()
            return UserCardResponse(
                id=str(user_card.id),
                collection_id=str(collection_id),
                scryfall_card_id=user_card.scryfall_card_id,
                quantity=0,
                is_foil=user_card.is_foil,
                is_for_trade=user_card.is_for_trade,
                condition=user_card.condition
            )

        user_card.quantity = new_qty

    # 2. Ajuste de flags y atributos de trade
    if payload.is_for_trade is not None:
        user_card.is_for_trade = payload.is_for_trade

    if payload.is_foil is not None:
        user_card.is_foil = payload.is_foil

    if payload.condition is not None:
        user_card.condition = payload.condition

    if payload.trade_notes is not None and hasattr(user_card, "trade_notes"):
        user_card.trade_notes = payload.trade_notes

    db.commit()
    db.refresh(user_card)

    return user_card