from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, Deck, CartaScryfall
from app.crud import crud_decks
from app.schemas import (
    DeckCreate,
    DeckResponse,
    AddCardToDeckPayload,
    DeckCardDetailResponse
)
from app.services.inventory_service import calculate_deck_availability

router = APIRouter(
    tags=["Mazos y Construcción de Decks"]
)


class UpdateDeckCardPayload(BaseModel):
    quantity: Optional[int] = Field(None, ge=1, le=100)
    category: Optional[str] = Field(None, pattern=r"^(mainboard|sideboard|maybeboard|commander)$")


# ---------------------------------------------------------
# 1. CREACIÓN Y CONSULTA DE MAZOS
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
    if crud_decks.count_user_decks(db, str(current_user.id)) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Has alcanzado el límite máximo de 10 mazos registrados."
        )

    return crud_decks.create_deck(db, user_id=str(current_user.id), payload=payload)


@router.get(
    "/decks/me",
    response_model=List[DeckResponse],
    summary="Listar todos los mazos del usuario autenticado"
)
def list_my_decks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud_decks.get_user_decks(db, user_id=str(current_user.id))


@router.get(
    "/decks/users/{user_id}",
    response_model=List[DeckResponse],
    summary="Listar mazos de otro usuario"
)
@router.get(
    "/users/{user_id}/decks",
    response_model=List[DeckResponse],
    include_in_schema=False  # Alias para compatibilidad con llamadas existentes
)
def list_user_decks(
    user_id: str,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return crud_decks.get_user_decks(db, user_id=user_id)


# ---------------------------------------------------------
# 2. GESTIÓN DE CARTAS EN EL MAZO (IDOR-Safe)
# ---------------------------------------------------------
@router.post(
    "/decks/{deck_id}/cards",
    status_code=status.HTTP_201_CREATED,
    summary="Agregar cartas a un mazo propio"
)
def add_card_to_deck(
    deck_id: str,
    payload: AddCardToDeckPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mazo = crud_decks.get_user_deck_by_id(db, deck_id=deck_id, user_id=str(current_user.id))
    if not mazo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mazo no encontrado o no tienes permisos sobre él."
        )

    carta = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La carta no existe en el catálogo."
        )

    deck_card = crud_decks.add_or_update_card_in_deck(db, deck_id=deck_id, payload=payload)
    return {"message": "Carta agregada exitosamente al mazo", "deck_card_id": deck_card.id}


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
    mazo = crud_decks.get_user_deck_by_id(db, deck_id=deck_id, user_id=str(current_user.id))
    if not mazo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mazo no encontrado o no autorizado.")

    deck_card = crud_decks.get_deck_card(db, deck_id=deck_id, card_id=card_id)
    if not deck_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta no encontrada en el mazo.")

    updated_card = crud_decks.update_deck_card(
        db, 
        deck_card=deck_card, 
        quantity=payload.quantity, 
        category=payload.category
    )
    return {"status": "success", "message": "Carta de mazo actualizada.", "deck_card_id": updated_card.id}


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
    mazo = crud_decks.get_user_deck_by_id(db, deck_id=deck_id, user_id=str(current_user.id))
    if not mazo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mazo no encontrado o no autorizado.")

    deck_card = crud_decks.get_deck_card(db, deck_id=deck_id, card_id=card_id)
    if not deck_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta no encontrada en el mazo.")

    crud_decks.remove_card_from_deck(db, deck_card)
    return {"status": "success", "message": "Carta removida del mazo exitosamente."}


# ---------------------------------------------------------
# 3. DISPONIBILIDAD FÍSICA DE CARTAS
# ---------------------------------------------------------
@router.get(
    "/decks/{deck_id}/cards",
    response_model=List[DeckCardDetailResponse],
    summary="Obtener cartas del mazo con disponibilidad de inventario"
)
def get_deck_cards_with_inventory_status(
    deck_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mazo = crud_decks.get_user_deck_by_id(db, deck_id=deck_id, user_id=str(current_user.id))
    if not mazo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mazo no encontrado o no autorizado."
        )

    return calculate_deck_availability(db, mazo)