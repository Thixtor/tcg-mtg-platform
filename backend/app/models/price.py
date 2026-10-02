# app/models/price.py
# ---------------------------------------------------------
# ENTIDAD DE DOMINIO: COTIZACIONES Y ANÁLISIS DE MERCADO (MTG)
# ---------------------------------------------------------
import uuid
from decimal import Decimal
from datetime import date
from enum import Enum
from typing import Optional
from sqlalchemy import Column, String, Numeric, Date, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class PriceProvider(str, Enum):
    CARDKINGDOM = "cardkingdom"
    TCGPLAYER = "tcgplayer"


class PriceVariant(str, Enum):
    NORMAL = "normal"
    FOIL = "foil"


class HistoricoPrecio(Base):
    """
    Entidad de Dominio: Registro cronológico de cotización de mercado.
    Encapsula la fuente de datos, acabado (normal/foil) y valor monetario en USD.
    """
    __tablename__ = 'historico_precios'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scryfall_card_id = Column(
        String, 
        ForeignKey('cartas.id', ondelete='CASCADE'), 
        nullable=False, 
        index=True
    )
    
    tienda = Column(String(30), nullable=False)  # cardkingdom, tcgplayer
    tipo = Column(String(10), nullable=False, default=PriceVariant.NORMAL.value)  # normal, foil
    precio_usd = Column(Numeric(10, 2), nullable=False)
    fecha = Column(Date, nullable=False, default=date.today)

    __table_args__ = (
        UniqueConstraint('scryfall_card_id', 'tienda', 'tipo', 'fecha', name='uq_historico_carta_tienda_fecha'),
        Index('idx_historico_carta_fecha', 'scryfall_card_id', 'fecha'),
    )

    card_catalog = relationship("CartaScryfall", back_populates="price_history")

    @classmethod
    def record_price(
        cls,
        scryfall_card_id: str,
        tienda: str,
        precio_usd: float | Decimal,
        tipo: str = "normal",
        fecha_registro: Optional[date] = None
    ) -> 'HistoricoPrecio':
        """Fábrica de dominio que asegura invariantes de precios válidos."""
        dec_price = Decimal(str(precio_usd))
        if dec_price < Decimal("0.00"):
            raise ValueError("El precio de cotización no puede ser negativo.")

        valid_tiendas = {p.value for p in PriceProvider}
        if tienda not in valid_tiendas:
            raise ValueError(f"Tienda no soportada: {tienda}. Opciones: {valid_tiendas}")

        valid_tipos = {t.value for t in PriceVariant}
        if tipo not in valid_tipos:
            raise ValueError(f"Tipo de acabado inválido: {tipo}. Opciones: {valid_tipos}")

        return cls(
            id=str(uuid.uuid4()),
            scryfall_card_id=scryfall_card_id,
            tienda=tienda,
            tipo=tipo,
            precio_usd=dec_price,
            fecha=fecha_registro or date.today()
        )