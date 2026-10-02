# app/routers/prices.py
# ---------------------------------------------------------
# ROUTER: PRECIOS Y ANALÍTICA DE MERCADO (POO / DDD REFACTORED)
# ---------------------------------------------------------
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.price import ResumenPreciosActuales, HistorialPreciosResponse
from app.services.price_service import PriceAnalyticsService

router = APIRouter(
    prefix="/cards",
    tags=["Precios y Analítica de Mercado"]
)


@router.get("/{scryfall_card_id}/prices/current", response_model=ResumenPreciosActuales)
def get_current_card_prices(
    scryfall_card_id: str, 
    db: Session = Depends(get_db)
):
    """Retorna las cotizaciones más recientes en USD para normal y foil."""
    return PriceAnalyticsService.get_current_prices_summary(db=db, scryfall_card_id=scryfall_card_id)


@router.get("/{scryfall_card_id}/prices/history", response_model=HistorialPreciosResponse)
def get_price_history(
    scryfall_card_id: str,
    tienda: str = Query("cardkingdom", pattern="^(cardkingdom|tcgplayer)$"),
    tipo: str = Query("normal", pattern="^(normal|foil)$"),
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db)
):
    """Retorna la serie temporal histórica para gráficos de evolución de precio."""
    return PriceAnalyticsService.get_price_history_series(
        db=db,
        scryfall_card_id=scryfall_card_id,
        tienda=tienda,
        tipo=tipo,
        days=days
    )