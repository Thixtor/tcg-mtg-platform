# app/routers/cards.py
# ---------------------------------------------------------
# ROUTER DE CATÁLOGO, BUSCADOR AVANZADO Y RECOMENDACIONES (POO / DDD)
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.card import CardSummary, CardDetail, SimilarCardsResponse
from app.services.card_catalog_service import CardCatalogService

router = APIRouter(
    prefix="/cards",
    tags=["Catálogo y Buscador"]
)


# ---------------------------------------------------------
# 1. BÚSQUEDA REACTIVA Y MULTI-FILTRO (LIGERA: CardSummary)
# ---------------------------------------------------------
@router.get(
    "/search",
    response_model=List[CardSummary],
    summary="Buscar cartas con sintaxis Scryfall u operadores visuales combinados"
)
def search_cards(
    q: Optional[str] = Query(
        None,
        max_length=200,
        description="Texto libre o sintaxis Scryfall (ej: Sol Ring, t:artifact, mv<=2, f:commander)"
    ),
    type: Optional[str] = Query(None, max_length=50, description="Tipo de carta (ej. Creature, Instant)"),
    colors: Optional[str] = Query(None, max_length=20, description="Identidad de color separada por coma"),
    rarity: Optional[str] = Query(None, max_length=20, description="Rareza (common, uncommon, rare, mythic)"),
    cmc: Optional[float] = Query(None, ge=0, le=16, description="Coste de maná convertido exacto"),
    limit: int = Query(24, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
):
    return CardCatalogService.search_cards(
        db=db,
        q=q,
        card_type=type,
        colors=colors,
        rarity=rarity,
        cmc=cmc,
        limit=limit
    )


# ---------------------------------------------------------
# 2. AUTOCOMPLETADO
# ---------------------------------------------------------
@router.get(
    "/autocomplete",
    response_model=List[str],
    summary="Sugerencias de autocompletado para campos de búsqueda avanzada"
)
def autocomplete_field(
    q: str = Query(..., min_length=1, max_length=100, description="Texto parcial ingresado"),
    field: str = Query("name", pattern="^(name|artist|oracle|keyword)$", description="Campo a consultar"),
    limit: int = Query(8, ge=1, le=25),
    db: Session = Depends(get_db)
):
    return CardCatalogService.autocomplete(db=db, q=q, field=field, limit=limit)


# ---------------------------------------------------------
# 3. CARTAS SIMILARES
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
    return CardCatalogService.get_similar_cards_or_fail(db=db, card_id=card_id, limit=limit)


# ---------------------------------------------------------
# 4. DETALLE COMPLETO (Retorna CardDetail con scryfall_raw_data)
# ---------------------------------------------------------
@router.get(
    "/{card_id}",
    response_model=CardDetail,
    summary="Obtener el detalle completo de una carta"
)
def get_card_by_id(
    card_id: str,
    db: Session = Depends(get_db)
):
    return CardCatalogService.get_card_by_id_or_fail(db=db, card_id=card_id)