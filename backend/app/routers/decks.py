# app/routers/decks.py
# ---------------------------------------------------------
# ROUTER: MAZOS Y CONSTRUCCIÓN DE DECKS (MTG - DDD REFACTORED)
# ---------------------------------------------------------
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models import User
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


# ---------------------------------------------------------
# 1. CREACIÓN, CONSULTA, DUPLICACIÓN Y ELIMINACIÓN DE MAZOS
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
    return DeckService.create_deck(db=db, user_id=str(current_user.id), payload=payload)


@router.get(
    "/decks/me",
    response_model=List[DeckResponse],
    summary="Listar todos los mazos del usuario autenticado"
)
def list_my_decks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DeckService.get_user_decks(db=db, user_id=str(current_user.id))


@router.get(
    "/decks/{deck_id}",
    response_model=DeckResponse,
    summary="Obtener información detallada de un mazo por ID"
)
def get_deck_detail(
    deck_id: str,
    db: Session = Depends(get_db)
):
    return DeckService.get_deck_or_fail(db=db, deck_id=deck_id)


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
    return DeckService.get_user_decks(db=db, user_id=user_id)


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
    return DeckService.fork_deck(
        db=db,
        deck_id=deck_id,
        current_user_id=str(current_user.id),
        new_name=new_name
    )


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