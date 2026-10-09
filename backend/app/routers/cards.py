# app/routers/cards.py
# ---------------------------------------------------------
# ROUTER DE CATÁLOGO, BUSCADOR AVANZADO Y RECOMENDACIONES (POO / DDD)
# ---------------------------------------------------------
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.card import CardSummary, CardDetail, SimilarCardsResponse
from app.services.card_catalog_service import CardCatalogService

logger = logging.getLogger("cards_router")

router: APIRouter = APIRouter(
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
        max_length=500,
        description="Texto libre o sintaxis Scryfall (ej: Sol Ring, t:artifact, mv<=2, f:commander)"
    ),
    order: Optional[str] = Query(
        None,
        max_length=50,
        description="Criterio de ordenamiento (ej: edhrec, name, cmc, rarity)"
    ),
    type: Optional[str] = Query(None, max_length=50, description="Tipo de carta (ej. Creature, Instant)"),
    colors: Optional[str] = Query(None, max_length=20, description="Identidad de color separada por coma"),
    rarity: Optional[str] = Query(None, max_length=20, description="Rareza (common, uncommon, rare, mythic)"),
    cmc: Optional[float] = Query(None, ge=0, le=16, description="Coste de maná convertido exacto"),
    limit: int = Query(24, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
) -> List[CardSummary]:
    """
    Busca cartas en el catálogo local y en Scryfall. Si no se especifican filtros,
    retorna cartas ordenadas por el criterio solicitado o nombre.
    """
    try:
        cleaned_query: Optional[str] = q.strip() if q and q.strip() else None
        cleaned_order: Optional[str] = order.strip().lower() if order and order.strip() else None

        return CardCatalogService.search_cards(
            db=db,
            q=cleaned_query,
            order=cleaned_order,
            card_type=type,
            colors=colors,
            rarity=rarity,
            cmc=cmc,
            limit=limit
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error procesando búsqueda de cartas: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar la búsqueda de cartas en el catálogo."
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
) -> List[str]:
    try:
        return CardCatalogService.autocomplete(db=db, q=q, field=field, limit=limit)
    except Exception as exc:
        logger.error(f"Error en autocompletado: {str(exc)}", exc_info=True)
        return []


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
) -> SimilarCardsResponse:
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
) -> CardDetail:
    return CardCatalogService.get_card_by_id_or_fail(db=db, card_id=card_id)