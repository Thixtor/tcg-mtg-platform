# ---------------------------------------------------------
# ROUTER DE CATÁLOGO, BUSCADOR AVANZADO Y RECOMENDACIONES
# ---------------------------------------------------------
from typing import List, Optional
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
# 1. BÚSQUEDA REACTIVA Y MULTI-FILTRO DE CARTAS
# ---------------------------------------------------------
@router.get(
    "/search",
    response_model=List[CardResponse],
    summary="Buscar cartas con filtros combinados (nombre, color, tipo, CMC, rareza)"
)
def search_cards(
    q: Optional[str] = Query(None, description="Texto de búsqueda para el nombre de la carta"),
    type: Optional[str] = Query(None, description="Tipo de carta (ej. Creature, Instant, Sorcery, Artifact)"),
    colors: Optional[str] = Query(None, description="Identidad de color separada por coma (ej. W,U o C para incoloro)"),
    rarity: Optional[str] = Query(None, description="Rareza (common, uncommon, rare, mythic)"),
    cmc: Optional[int] = Query(None, ge=0, le=16, description="Coste de maná convertido exacto"),
    limit: int = Query(24, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
):
    """
    Retorna cartas que coincidan con la combinación de filtros solicitada.
    Si no se envía texto 'q', filtra directamente por los atributos especificados.
    """
    # Si no hay ningún criterio de búsqueda, retornamos lista vacía para no saturar
    if not any([q, type, colors, rarity, cmc is not None]):
        return []

    return crud_cards.search_cards_advanced(
        db=db,
        query_text=q,
        card_type=type,
        colors=colors,
        rarity=rarity,
        cmc=cmc,
        limit=limit
    )


# ---------------------------------------------------------
# 2. CARTAS FUNCIONALMENTE SIMILARES / SUSTITUTOS DE MAZO
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