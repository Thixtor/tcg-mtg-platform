from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.price import HistoricoPrecio


# ---------------------------------------------------------
# OPERACIONES DE BASE DE DATOS: COTIZACIONES E HISTÓRICO
# ---------------------------------------------------------
def get_latest_price(
    db: Session, 
    scryfall_card_id: str, 
    tienda: str, 
    tipo: str
) -> Optional[float]:
    """
    Obtiene el último precio registrado para una carta en una tienda y acabado específico.
    """
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


def get_price_history_series(
    db: Session,
    scryfall_card_id: str,
    tienda: str,
    tipo: str,
    fecha_corte: date
) -> List[HistoricoPrecio]:
    """
    Obtiene la serie temporal ascendente (cronológica) a partir de una fecha mínima de corte.
    """
    return (
        db.query(HistoricoPrecio)
        .filter(
            HistoricoPrecio.scryfall_card_id == scryfall_card_id,
            HistoricoPrecio.tienda == tienda,
            HistoricoPrecio.tipo == tipo,
            HistoricoPrecio.fecha >= fecha_corte
        )
        .order_by(HistoricoPrecio.fecha.asc())
        .all()
    )