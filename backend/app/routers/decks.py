from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, Deck, DeckCard, CartaScryfall
from app.schemas import (
    DeckCreate,
    DeckResponse,
    AddCardToDeckPayload,
    DeckCardDetailResponse
)
from app.services.inventory_service import calculate_deck_availability

router = APIRouter(
    prefix="/decks",
    tags=["Mazos y Construcción de Decks"]
)


# ---------------------------------------------------------
# 1. CREACIÓN Y CONSULTA DE MAZOS
# ---------------------------------------------------------
@router.post(
    "/",
    response_model=DeckResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo mazo para el usuario autenticado"
)
def create_deck(
    payload: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conteo_mazos = db.query(Deck).filter(Deck.user_id == current_user.id).count()
    if conteo_mazos >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Has alcanzado el límite máximo de 10 mazos registrados."
        )

    nuevo_mazo = Deck(
        user_id=current_user.id,
        name=payload.name,
        format=payload.format,
        description=payload.description
    )
    db.add(nuevo_mazo)
    db.commit()
    db.refresh(nuevo_mazo)
    return nuevo_mazo


@router.get(
    "/me",
    response_model=List[DeckResponse],
    summary="Listar todos los mazos del usuario autenticado"
)
def list_my_decks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Deck).filter(Deck.user_id == current_user.id).all()


@router.get(
    "/users/{user_id}",
    response_model=List[DeckResponse],
    summary="Listar mazos de otro usuario"
)
def list_user_decks(
    user_id: str,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return db.query(Deck).filter(Deck.user_id == user_id).all()


# ---------------------------------------------------------
# 2. GESTIÓN DE CARTAS EN EL MAZO (CON VERIFICACIÓN DE PROPIEDAD)
# ---------------------------------------------------------
@router.post(
    "/{deck_id}/cards",
    status_code=status.HTTP_201_CREATED,
    summary="Agregar cartas a un mazo propio"
)
def add_card_to_deck(
    deck_id: str,
    payload: AddCardToDeckPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mazo = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
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

    deck_card = DeckCard(
        deck_id=deck_id,
        scryfall_card_id=payload.scryfall_card_id,
        quantity=payload.quantity,
        category=payload.category
    )
    db.add(deck_card)
    db.commit()
    db.refresh(deck_card)
    return {"message": "Carta agregada exitosamente al mazo", "deck_card_id": deck_card.id}


# ---------------------------------------------------------
# 3. DISPONIBILIDAD FÍSICA DE CARTAS
# ---------------------------------------------------------
@router.get(
    "/{deck_id}/cards",
    response_model=List[DeckCardDetailResponse],
    summary="Obtener las cartas del mazo con su estado de disponibilidad física"
)
def get_deck_cards_with_inventory_status(
    deck_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mazo = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    if not mazo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mazo no encontrado o no autorizado."
        )

    return calculate_deck_availability(db, mazo)