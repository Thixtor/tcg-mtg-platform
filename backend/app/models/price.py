import uuid
from datetime import date
from sqlalchemy import Column, String, Numeric, Date, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# 7. HISTÓRICO Y EVOLUCIÓN DE PRECIOS
# ---------------------------------------------------------
class HistoricoPrecio(Base):
    """
    Registro cronológico de cotizaciones para análisis y gráficas temporales.
    """
    __tablename__ = 'historico_precios'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scryfall_card_id = Column(String, ForeignKey('cartas.id', ondelete='CASCADE'), nullable=False, index=True)
    
    tienda = Column(String(30), nullable=False)  # cardkingdom, tcgplayer
    tipo = Column(String(10), nullable=False, default="normal")  # normal, foil
    precio_usd = Column(Numeric(10, 2), nullable=False)
    fecha = Column(Date, nullable=False, default=date.today)

    __table_args__ = (
        UniqueConstraint('scryfall_card_id', 'tienda', 'tipo', 'fecha', name='uq_historico_carta_tienda_fecha'),
        Index('idx_historico_carta_fecha', 'scryfall_card_id', 'fecha'),
    )

    card_catalog = relationship("CartaScryfall", back_populates="price_history")