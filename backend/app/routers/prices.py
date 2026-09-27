from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Importación de dependencias del núcleo
from app.database import get_db
from app.models import CartaScryfall, HistoricoPrecio
from app.schemas import ResumenPreciosActuales, HistorialPreciosResponse, PuntoPrecio

router = APIRouter(
    prefix="/cards",
    tags=["Precios y Analítica de Mercado"]
)


# ---------------------------------------------------------
# 1. COTIZACIONES ACTUALES (Para Ficha y Balanceo de Trade)
# ---------------------------------------------------------
@router.get(
    "/{scryfall_card_id}/prices/current",
    response_model=ResumenPreciosActuales,
    summary="Obtener cotizaciones más recientes de una carta",
    description="Retorna el último precio registrado para Card Kingdom y TCGplayer (normal y foil)."
)
def get_current_card_prices(
    scryfall_card_id: str,
    db: Session = Depends(get_db)
):
    """
    Busca los registros más recientes en la tabla historico_precios
    para la carta indicada y consolida un resumen de cotizaciones.
    """
    # 1. Validar que la carta exista en el catálogo oficial
    carta = db.query(CartaScryfall).filter(CartaScryfall.id == scryfall_card_id).first()
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{scryfall_card_id}' no existe en el catálogo."
        )

    # 2. Función auxiliar interna para extraer el último precio de una tienda y acabado específico
    def _obtener_ultimo_precio(tienda: str, tipo: str) -> Optional[float]:
        registro = (
            db.query(HistoricoPrecio.precio_usd)
            .filter(
                HistoricoPrecio.scryfall_card_id == scryfall_card_id,
                HistoricoPrecio.tienda == tienda,
                HistoricoPrecio.tipo == tipo
            )
            .order_by(HistoricoPrecio.fecha.desc())
            .first()
        )
        return float(registro[0]) if registro else None

    # 3. Ensamblar resumen de precios
    return ResumenPreciosActuales(
        scryfall_card_id=scryfall_card_id,
        cardkingdom_usd=_obtener_ultimo_precio("cardkingdom", "normal"),
        cardkingdom_foil_usd=_obtener_ultimo_precio("cardkingdom", "foil"),
        tcgplayer_usd=_obtener_ultimo_precio("tcgplayer", "normal"),
        tcgplayer_foil_usd=_obtener_ultimo_precio("tcgplayer", "foil"),
    )


# ---------------------------------------------------------
# 2. SERIE TEMPORAL PARA GRÁFICAS HISTÓRICAS
# ---------------------------------------------------------
@router.get(
    "/{scryfall_card_id}/prices/history",
    response_model=HistorialPreciosResponse,
    summary="Obtener serie histórica de precios para visualización gráfica",
    description="Retorna una secuencia ordenada cronológicamente de fechas y precios dentro de una ventana de tiempo (días)."
)
def get_price_history(
    scryfall_card_id: str,
    tienda: str = Query(
        "cardkingdom", 
        pattern="^(cardkingdom|tcgplayer)$", 
        description="Tienda de referencia ('cardkingdom' o 'tcgplayer')"
    ),
    tipo: str = Query(
        "normal", 
        pattern="^(normal|foil)$", 
        description="Acabado de la carta ('normal' o 'foil')"
    ),
    days: int = Query(
        90, 
        ge=7, 
        le=365, 
        description="Ventana temporal en días hacia atrás (ej. 30, 90, 180, 365)"
    ),
    db: Session = Depends(get_db)
):
    """
    Genera el dataset de puntos (fecha, precio) listo para ser renderizado
    por componentes visuales en React (Recharts / Chart.js).
    """
    # 1. Validar existencia de la carta
    carta = db.query(CartaScryfall).filter(CartaScryfall.id == scryfall_card_id).first()
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{scryfall_card_id}' no existe en el catálogo."
        )

    # 2. Calcular la fecha mínima de corte
    fecha_corte = date.today() - timedelta(days=days)

    # 3. Consultar la serie temporal indexada en orden ascendente (cronológico)
    registros = (
        db.query(HistoricoPrecio.fecha, HistoricoPrecio.precio_usd)
        .filter(
            HistoricoPrecio.scryfall_card_id == scryfall_card_id,
            HistoricoPrecio.tienda == tienda,
            HistoricoPrecio.tipo == tipo,
            HistoricoPrecio.fecha >= fecha_corte
        )
        .order_by(HistoricoPrecio.fecha.asc())
        .all()
    )

    # 4. Formatear la lista de puntos
    puntos_grafica: List[PuntoPrecio] = [
        PuntoPrecio(fecha=r.fecha, precio_usd=float(r.precio_usd)) 
        for r in registros
    ]

    return HistorialPreciosResponse(
        scryfall_card_id=scryfall_card_id,
        tienda=tienda,
        tipo=tipo,
        rango_dias=days,
        puntos=puntos_grafica
    )