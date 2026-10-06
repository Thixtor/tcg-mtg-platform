# app/routers/decks.py
# ---------------------------------------------------------
# ROUTER: MAZOS Y CONSTRUCCIÓN DE DECKS (MTG - DDD REFACTORED)
# ---------------------------------------------------------
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, Deck
from app.models.deck import DeckCard
from app.services.deck_service import DeckService
from app.services.inventory_service import calculate_deck_availability
from app.schemas.deck import (
    DeckCreate,
    DeckResponse,
    AddCardToDeckPayload,
    UpdateDeckCardPayload,
    BulkAddCardsPayload,
    BulkAddCardsResponse,
    DeckCardDetailResponse
)

router = APIRouter(
    tags=["Mazos y Construcción de Decks"]
)

MTG_CARD_BACK_FALLBACK = "https://cards.scryfall.io/back.png"


def _is_valid_uuid(val: Any) -> bool:
    """Verifica si el identificador tiene un formato UUID canónico válido."""
    if not val:
        return False
    try:
        uuid.UUID(str(val).strip())
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _enrich_deck_visuals(db: Session, deck: Deck) -> Deck:
    """
    Resuelve e inyecta la URL de ilustración y el nombre del comandante
    leyendo DeckCard y CartaScryfall. Evita URLs rotas que provoquen bloqueos CORB.
    """
    if getattr(deck, "cover_image_url", None):
        return deck

    # 1. Obtener la lista de cartas asociadas
    cards = deck.cards if hasattr(deck, "cards") and deck.cards else []
    
    # 2. Priorizar la carta con categoría commander
    target_card = next((c for c in cards if getattr(c, "category", None) == "commander"), None)

    # Si no está en memoria, consultar la base de datos directamente
    if not target_card:
        target_card = (
            db.query(DeckCard)
            .filter(DeckCard.deck_id == deck.id, DeckCard.category == "commander")
            .first()
        )

    # 3. Fallback: tomar la primera carta registrada en el mazo
    if not target_card:
        target_card = cards[0] if cards else (
            db.query(DeckCard)
            .filter(DeckCard.deck_id == deck.id)
            .first()
        )

    resolved_img = None
    resolved_name = None

    if target_card and getattr(target_card, "scryfall_card_id", None):
        scry_id = str(target_card.scryfall_card_id).strip()

        # Intentar extraer datos desde el catálogo precargado
        catalog = getattr(target_card, "card_catalog", None)
        if catalog:
            resolved_name = getattr(catalog, "name", None)

            if hasattr(catalog, "image_uris") and isinstance(catalog.image_uris, dict):
                resolved_img = (
                    catalog.image_uris.get("art_crop")
                    or catalog.image_uris.get("normal")
                )
            elif hasattr(catalog, "card_faces") and isinstance(catalog.card_faces, list) and catalog.card_faces:
                first_face = catalog.card_faces[0]
                if isinstance(first_face, dict) and "image_uris" in first_face:
                    resolved_img = (
                        first_face["image_uris"].get("art_crop")
                        or first_face["image_uris"].get("normal")
                    )

            if not resolved_img and getattr(catalog, "image_url", None):
                resolved_img = catalog.image_url

        # Solo construir URL a Scryfall si el ID es un UUID real para evitar 404 JSON (CORB)
        if not resolved_img and _is_valid_uuid(scry_id):
            resolved_img = f"https://api.scryfall.com/cards/{scry_id}?format=image&version=art_crop"

    # Respaldo visual garantizado si no hay imagen asignada
    if not resolved_img:
        resolved_img = MTG_CARD_BACK_FALLBACK

    deck.cover_image_url = resolved_img
    deck.commander_image_url = resolved_img
    if resolved_name:
        deck.commander_name = resolved_name

    return deck


# ---------------------------------------------------------
# 1. CREACIÓN, CONSULTAS PÚBLICAS Y PRIVADAS DE MAZOS
# ---------------------------------------------------------
@router.post(
    "/decks",
    response_model=DeckResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo mazo para el usuario autenticado"
)
def create_deck(
    payload: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck = DeckService.create_deck(db=db, user_id=str(current_user.id), payload=payload)
    return _enrich_deck_visuals(db, deck)


@router.get(
    "/decks/me",
    response_model=List[DeckResponse],
    summary="Listar todos los mazos del usuario autenticado"
)
def list_my_decks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decks = DeckService.get_user_decks(db=db, user_id=str(current_user.id))
    for d in decks:
        _enrich_deck_visuals(db, d)
    return decks


@router.get(
    "/decks/public",
    response_model=List[DeckResponse],
    summary="Listar mazos públicos de la comunidad"
)
@router.get(
    "/decks",
    response_model=List[DeckResponse],
    summary="Listado general de mazos públicos con filtros"
)
def list_public_decks(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    sort_by: str = Query("recent"),
    format: Optional[str] = Query(None),
    is_public: Optional[bool] = Query(True),
    db: Session = Depends(get_db)
):
    """
    Retorna los mazos públicos comunitarios con imágenes de portada enriquecidas.
    """
    query = db.query(Deck)
    cols = Deck.__table__.columns.keys()

    if "is_public" in cols and is_public is not None:
        query = query.filter(Deck.is_public == is_public)

    if format and "format" in cols:
        query = query.filter(Deck.format.ilike(f"%{format}%"))

    if sort_by == "upvotes" and "upvotes_count" in cols:
        query = query.order_by(desc(Deck.upvotes_count))
    elif sort_by == "likes" and "likes_count" in cols:
        query = query.order_by(desc(Deck.likes_count))
    elif "created_at" in cols:
        query = query.order_by(desc(Deck.created_at))
    elif "id" in cols:
        query = query.order_by(desc(Deck.id))

    decks = query.offset(skip).limit(limit).all()

    for d in decks:
        _enrich_deck_visuals(db, d)

    return decks


@router.get(
    "/decks/{deck_id}",
    response_model=DeckResponse,
    summary="Obtener información detallada de un mazo por ID"
)
def get_deck_detail(
    deck_id: str,
    db: Session = Depends(get_db)
):
    deck = DeckService.get_deck_or_fail(db=db, deck_id=deck_id)
    return _enrich_deck_visuals(db, deck)


@router.get(
    "/decks/users/{user_id}",
    response_model=List[DeckResponse],
    summary="Listar mazos de otro usuario"
)
@router.get(
    "/users/{user_id}/decks",
    response_model=List[DeckResponse],
    include_in_schema=False
)
def list_user_decks(
    user_id: str,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )
    decks = DeckService.get_user_decks(db=db, user_id=user_id)
    for d in decks:
        _enrich_deck_visuals(db, d)
    return decks


@router.post(
    "/decks/{deck_id}/fork",
    response_model=DeckResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicar / Forkear un mazo hacia la biblioteca propia"
)
def fork_deck(
    deck_id: str,
    new_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck = DeckService.fork_deck(
        db=db,
        deck_id=deck_id,
        current_user_id=str(current_user.id),
        new_name=new_name
    )
    return _enrich_deck_visuals(db, deck)


@router.delete(
    "/decks/{deck_id}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar un mazo completo del usuario autenticado"
)
def delete_deck(
    deck_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    DeckService.delete_deck(db=db, deck_id=deck_id, user_id=str(current_user.id))
    return {"status": "success", "message": "Mazo eliminado exitosamente."}


# ---------------------------------------------------------
# 2. GESTIÓN DE CARTAS EN EL MAZO (INDIVIDUAL Y BULK)
# ---------------------------------------------------------
@router.post(
    "/decks/{deck_id}/cards",
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una carta individual a un mazo propio"
)
def add_card_to_deck(
    deck_id: str,
    payload: AddCardToDeckPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck_card = DeckService.add_card_to_deck(
        db=db,
        deck_id=deck_id,
        user_id=str(current_user.id),
        payload=payload
    )
    return {"message": "Carta agregada exitosamente al mazo", "deck_card_id": deck_card.id}


@router.post(
    "/decks/{deck_id}/cards/bulk",
    response_model=BulkAddCardsResponse,
    status_code=status.HTTP_200_OK,
    summary="Agregar múltiples cartas a un mazo en lote (Bulk Import)"
)
def bulk_add_cards_to_deck(
    deck_id: str,
    payload: BulkAddCardsPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = DeckService.bulk_add_cards(
        db=db,
        deck_id=deck_id,
        user_id=str(current_user.id),
        cards_data=payload.cards
    )
    return {
        "message": f"Se procesaron {result['added_count']} cartas correctamente.",
        "added_count": result["added_count"],
        "failed_card_ids": result["failed_card_ids"]
    }


@router.patch(
    "/decks/{deck_id}/cards/{card_id}",
    summary="Actualizar cantidad o categoría de una carta en un mazo propio"
)
def update_card_in_deck(
    deck_id: str,
    card_id: str,
    payload: UpdateDeckCardPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = DeckService.update_deck_card(
        db=db,
        deck_id=deck_id,
        card_id=card_id,
        user_id=str(current_user.id),
        quantity=payload.quantity,
        category=payload.category
    )
    return {"status": "success", "message": "Carta de mazo actualizada.", "deck_card_id": updated.id}


@router.delete(
    "/decks/{deck_id}/cards/{card_id}",
    summary="Eliminar una carta de un mazo propio"
)
def remove_card_from_deck(
    deck_id: str,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    DeckService.remove_card_from_deck(
        db=db,
        deck_id=deck_id,
        card_id=card_id,
        user_id=str(current_user.id)
    )
    return {"status": "success", "message": "Carta removida del mazo exitosamente."}


# ---------------------------------------------------------
# 3. DOMINIO MTG: DISPONIBILIDAD, LEGALIDAD Y MÉTRICAS
# ---------------------------------------------------------
@router.get(
    "/decks/{deck_id}/cards",
    response_model=List[DeckCardDetailResponse],
    summary="Obtener cartas del mazo con disponibilidad de inventario y metadatos canónicos"
)
def get_deck_cards_with_inventory_status(
    deck_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mazo = DeckService.get_deck_or_fail(db=db, deck_id=deck_id, user_id=str(current_user.id))
    return calculate_deck_availability(db, mazo)


@router.get(
    "/decks/{deck_id}/metrics",
    summary="Obtener auditoría de legalidad, identidad de color y CMC promedio del mazo"
)
def get_deck_metrics(
    deck_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    deck = DeckService.get_deck_or_fail(db=db, deck_id=deck_id)
    return deck.validate_legality()