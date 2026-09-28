# ---------------------------------------------------------
# ROUTER DE CATÁLOGO, BUSCADOR Y RECOMENDACIÓN DE CARTAS
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.card import CardResponse, SimilarCardsResponse
from app.crud import crud_cards

router = APIRouter(
    prefix="/cards",
    tags=["Catálogo y Buscador"]
)

# ---------------------------------------------------------
# 1. BÚSQUEDA REACTIVA DE CARTAS
# ---------------------------------------------------------
@router.get(
    "/search",
    response_model=List[CardResponse],
    summary="Buscar cartas en el catálogo local"
)
def search_cards(
    q: str = Query(..., min_length=2, description="Texto de búsqueda para el nombre de la carta"),
    limit: int = Query(20, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
):
    return crud_cards.search_cards_by_name(db, query_text=q, limit=limit)


# ---------------------------------------------------------
# 2. CARTAS FUNCIONALMENTE SIMILARES / ALTERNATIVAS DE MAZO
# ---------------------------------------------------------
@router.get(
    "/{card_id}/similar",
    response_model=SimilarCardsResponse,
    summary="Obtener cartas funcionalmente similares o sustitutos de mazo"
)
def get_similar_cards(
    card_id: str,
    limit: int = Query(6, ge=1, le=20, description="Cantidad máxima de cartas similares a retornar"),
    db: Session = Depends(get_db)
):
    """
    Retorna cartas alternativas que cumplen un rol funcional análogo en el juego
    (mismo arquetipo/efecto e identidad de color compatible).
    """
    resultado = crud_cards.get_similar_cards(db, card_id=card_id, limit=limit)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{card_id}' no fue encontrada para buscar similares."
        )
    return resultado


# ---------------------------------------------------------
# 3. DETALLE ESPECÍFICO DE UNA CARTA
# ---------------------------------------------------------
@router.get(
    "/{card_id}",
    response_model=CardResponse,
    summary="Obtener el detalle completo de una carta"
)
def get_card_by_id(
    card_id: str,
    db: Session = Depends(get_db)
):
    carta = crud_cards.get_card_by_id(db, card_id=card_id)
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{card_id}' no fue encontrada en el catálogo."
        )
    return carta