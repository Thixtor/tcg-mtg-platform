from datetime import date, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.price import ResumenPreciosActuales, HistorialPreciosResponse, PuntoPrecio
from app.crud import crud_cards, crud_prices

router = APIRouter(
    prefix="/cards",
    tags=["Precios y Analítica de Mercado"]
)

@router.get("/{scryfall_card_id}/prices/current", response_model=ResumenPreciosActuales)
def get_current_card_prices(scryfall_card_id: str, db: Session = Depends(get_db)):
    carta = crud_cards.get_card_by_id(db, card_id=scryfall_card_id)
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{scryfall_card_id}' no existe en el catálogo."
        )

    return ResumenPreciosActuales(
        scryfall_card_id=scryfall_card_id,
        cardkingdom_usd=crud_prices.get_latest_price(db, scryfall_card_id, "cardkingdom", "normal"),
        cardkingdom_foil_usd=crud_prices.get_latest_price(db, scryfall_card_id, "cardkingdom", "foil"),
        tcgplayer_usd=crud_prices.get_latest_price(db, scryfall_card_id, "tcgplayer", "normal"),
        tcgplayer_foil_usd=crud_prices.get_latest_price(db, scryfall_card_id, "tcgplayer", "foil"),
    )


@router.get("/{scryfall_card_id}/prices/history", response_model=HistorialPreciosResponse)
def get_price_history(
    scryfall_card_id: str,
    tienda: str = Query("cardkingdom", pattern="^(cardkingdom|tcgplayer)$"),
    tipo: str = Query("normal", pattern="^(normal|foil)$"),
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db)
):
    carta = crud_cards.get_card_by_id(db, card_id=scryfall_card_id)
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{scryfall_card_id}' no existe en el catálogo."
        )

    fecha_corte = date.today() - timedelta(days=days)
    registros = crud_prices.get_price_history_series(
        db, 
        scryfall_card_id=scryfall_card_id, 
        tienda=tienda, 
        tipo=tipo, 
        fecha_corte=fecha_corte
    )

    return HistorialPreciosResponse(
        scryfall_card_id=scryfall_card_id,
        tienda=tienda,
        tipo=tipo,
        rango_dias=days,
        puntos=[PuntoPrecio(fecha=r.fecha, precio_usd=float(r.precio_usd)) for r in registros]
    )