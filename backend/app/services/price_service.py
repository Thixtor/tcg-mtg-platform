# app/services/price_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: ANALÍTICA Y EVOLUCIÓN TEMPORAL DE PRECIOS
# ---------------------------------------------------------
from datetime import date, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.price import HistoricoPrecio
from app.models.card import CartaScryfall
from app.schemas.price import ResumenPreciosActuales, HistorialPreciosResponse, PuntoPrecio


class PriceAnalyticsService:
    """
    Servicio de Dominio encargado de recopilar las cotizaciones más recientes
    y construir series temporales para el análisis de mercado de cartas MTG.
    """

    @classmethod
    def verify_card_exists_or_fail(cls, db: Session, card_id: str) -> CartaScryfall:
        carta = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
        if not carta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La carta con ID '{card_id}' no existe en el catálogo."
            )
        return carta

    @classmethod
    def get_latest_price(
        cls,
        db: Session,
        scryfall_card_id: str,
        tienda: str,
        tipo: str
    ) -> Optional[float]:
        """Obtiene la cotización más reciente registrada."""
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
        return float(registro[0]) if registro and registro[0] is not None else None

    @classmethod
    def get_current_prices_summary(
        cls,
        db: Session,
        scryfall_card_id: str
    ) -> ResumenPreciosActuales:
        """Construye el resumen de cotizaciones vigentes de CardKingdom y TCGPlayer."""
        cls.verify_card_exists_or_fail(db, scryfall_card_id)

        return ResumenPreciosActuales(
            scryfall_card_id=scryfall_card_id,
            cardkingdom_usd=cls.get_latest_price(db, scryfall_card_id, "cardkingdom", "normal"),
            cardkingdom_foil_usd=cls.get_latest_price(db, scryfall_card_id, "cardkingdom", "foil"),
            tcgplayer_usd=cls.get_latest_price(db, scryfall_card_id, "tcgplayer", "normal"),
            tcgplayer_foil_usd=cls.get_latest_price(db, scryfall_card_id, "tcgplayer", "foil"),
        )

    @classmethod
    def get_price_history_series(
        cls,
        db: Session,
        scryfall_card_id: str,
        tienda: str = "cardkingdom",
        tipo: str = "normal",
        days: int = 90
    ) -> HistorialPreciosResponse:
        """Recupera la serie temporal de precios dentro de una ventana de días."""
        cls.verify_card_exists_or_fail(db, scryfall_card_id)

        fecha_corte = date.today() - timedelta(days=days)
        registros = (
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

        puntos: List[PuntoPrecio] = [
            PuntoPrecio(fecha=r.fecha, precio_usd=float(r.precio_usd))
            for r in registros
        ]

        return HistorialPreciosResponse(
            scryfall_card_id=scryfall_card_id,
            tienda=tienda,
            tipo=tipo,
            rango_dias=days,
            puntos=puntos
        )