from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Dependencias internas del núcleo
from app.database import get_db
from app.models import User, Deck, DeckCard, UserCard, Collection, CartaScryfall
from app.schemas import (
    DeckCreate,
    DeckResponse,
    AddCardToDeckPayload,
    DeckCardDetailResponse
)

router = APIRouter(
    prefix="/decks",
    tags=["Mazos y Construcción de Decks"]
)


# ---------------------------------------------------------
# 1. CREACIÓN Y CONSULTA DE MAZOS
# ---------------------------------------------------------
@router.post(
    "/users/{user_id}",
    response_model=DeckResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo mazo",
    description="Permite crear un mazo respetando el límite máximo de 10 por usuario."
)
def create_deck(
    user_id: str,
    payload: DeckCreate,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID '{user_id}' no encontrado."
        )

    conteo_mazos = db.query(Deck).filter(Deck.user_id == user_id).count()
    if conteo_mazos >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Has alcanzado el límite máximo de 10 mazos registrados."
        )

    nuevo_mazo = Deck(
        user_id=user_id,
        name=payload.name,
        format=payload.format,
        description=payload.description
    )
    db.add(nuevo_mazo)
    db.commit()
    db.refresh(nuevo_mazo)
    return nuevo_mazo


@router.get(
    "/users/{user_id}",
    response_model=List[DeckResponse],
    summary="Listar todos los mazos de un usuario"
)
def list_user_decks(
    user_id: str,
    db: Session = Depends(get_db)
):
    return db.query(Deck).filter(Deck.user_id == user_id).all()


# ---------------------------------------------------------
# 2. GESTIÓN DE CARTAS EN EL MAZO
# ---------------------------------------------------------
@router.post(
    "/{deck_id}/cards",
    status_code=status.HTTP_201_CREATED,
    summary="Agregar cartas a un mazo"
)
def add_card_to_deck(
    deck_id: str,
    payload: AddCardToDeckPayload,
    db: Session = Depends(get_db)
):
    mazo = db.query(Deck).filter(Deck.id == deck_id).first()
    if not mazo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mazo con ID '{deck_id}' no encontrado."
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
# 3. DETALLE DE CARTAS Y ESTADO DE DISPONIBILIDAD FÍSICA
# ---------------------------------------------------------
@router.get(
    "/{deck_id}/cards",
    response_model=List[DeckCardDetailResponse],
    summary="Obtener las cartas del mazo con su estado de disponibilidad física"
)
def get_deck_cards_with_inventory_status(
    deck_id: str,
    db: Session = Depends(get_db)
):
    """
    Analiza cada carta del mazo comparándola contra el inventario del usuario:
    - DISPONIBLE: El usuario tiene copias físicas en sus colecciones.
    - EN_OTRO_MAZO: La carta está asignada en otro mazo del usuario.
    - FALTANTE: El usuario no posee la carta físicamente.
    """
    mazo = db.query(Deck).filter(Deck.id == deck_id).first()
    if not mazo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mazo no encontrado."
        )

    cartas_mazo = db.query(DeckCard).filter(DeckCard.deck_id == deck_id).all()
    user_id = mazo.user_id

    # Obtener qué cartas físicas posee el usuario en sus binders
    cartas_posesion = (
        db.query(UserCard.scryfall_card_id)
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id)
        .all()
    )
    ids_en_posesion = {c[0] for c in cartas_posesion}

    # Obtener asignaciones en otros mazos del mismo usuario
    otros_mazos_cards = (
        db.query(DeckCard.scryfall_card_id, Deck.name)
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(Deck.user_id == user_id, Deck.id != deck_id)
        .all()
    )
    mapa_otros_mazos = {}
    for scry_id, nombre_mazo in otros_mazos_cards:
        mapa_otros_mazos.setdefault(scry_id, []).append(nombre_mazo)

    detalle_resultado = []
    for dc in cartas_mazo:
        scry_id = dc.scryfall_card_id
        carta_cat = dc.card_catalog

        # Determinar status
        if scry_id in mapa_otros_mazos:
            estado = "EN_OTRO_MAZO"
        elif scry_id in ids_en_posesion:
            estado = "DISPONIBLE"
        else:
            estado = "FALTANTE"

        detalle_resultado.append(
            DeckCardDetailResponse(
                deck_card_id=dc.id,
                scryfall_card_id=scry_id,
                name=carta_cat.name if carta_cat else "Desconocida",
                set_code=carta_cat.set if carta_cat else None,
                image_url=carta_cat.image_url if carta_cat else None,
                quantity_needed=dc.quantity,
                category=dc.category,
                status=estado,
                assigned_other_decks=mapa_otros_mazos.get(scry_id, [])
            )
        )

    return detalle_resultado