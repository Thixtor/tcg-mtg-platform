# app/models/card.py
# ---------------------------------------------------------
# CATÁLOGO OFICIAL DE SCRYFALL (BASE DE REFERENCIA)
# ---------------------------------------------------------
from sqlalchemy import Column, String, Float, Index, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, deferred
from app.database import Base


class CartaScryfall(Base):
    """
    Catálogo maestro sincronizado con Scryfall.
    Almacena atributos clave indexados, cotizaciones Card Kingdom y el payload JSONB íntegro diferido.
    """
    __tablename__ = 'cartas'

    id = Column(String, primary_key=True, index=True)  # Scryfall Printing UUID
    oracle_id = Column(String, index=True, nullable=True)  # Identidad canónica MTG (CR 108.1)
    name = Column(String, nullable=False, index=True)
    set = Column(String, index=True)
    type_line = Column(String, index=True)
    mana_cost = Column(String)
    image_url = Column(String)

    # Columnas nativas normalizadas para consultas instantáneas
    cmc = Column(Float, index=True, default=0.0)
    rarity = Column(String, index=True)
    colors = Column(String, index=True)  # Ej: "W,U" o "C" para incoloro
    color_identity = Column(String, index=True, default="", nullable=False)  # Para reglas Commander
    oracle_text = Column(String, nullable=True)

    # Cotizaciones de Card Kingdom desnormalizadas para renderizado instantáneo
    cardkingdom_price_retail = Column(Numeric(10, 2), nullable=True)
    cardkingdom_price_buylist = Column(Numeric(10, 2), nullable=True)
    cardkingdom_price_foil = Column(Numeric(10, 2), nullable=True)

    # Payload JSONB estructurado (marcado como diferido para no saturar memoria)
    scryfall_raw_data = deferred(Column(JSONB, nullable=False))

    # Relaciones
    instances_in_collections = relationship("UserCard", back_populates="card_catalog")
    price_history = relationship("HistoricoPrecio", back_populates="card_catalog", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_cartas_name_trgm', 'name', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'}),
    )