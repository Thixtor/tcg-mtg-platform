# app/models/card.py
# ---------------------------------------------------------
# CATÁLOGO CANÓNICO DE SCRYFALL (BASE DE REFERENCIA MTG)
# ---------------------------------------------------------
from sqlalchemy import Column, String, Float, Index, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


class CartaScryfall(Base):
    """
    Catálogo maestro sincronizado con Scryfall.
    Almacena atributos clave indexados y cotizaciones de Card Kingdom.
    Diseñado para consultas instantáneas y bajo consumo de almacenamiento.
    """
    __tablename__ = 'cartas'

    id = Column(String, primary_key=True, index=True)  # Scryfall Printing / Object UUID
    oracle_id = Column(String, index=True, nullable=True)  # Identidad canónica MTG (CR 108.1)
    name = Column(String, nullable=False, index=True)
    set = Column(String, index=True)
    type_line = Column(String, index=True)
    mana_cost = Column(String)
    image_url = Column(String)

    # Columnas nativas normalizadas para consultas y filtros
    cmc = Column(Float, index=True, default=0.0)
    rarity = Column(String, index=True)
    colors = Column(String, index=True)  # Ej: "W,U" o "C" para incoloro
    color_identity = Column(String, index=True, default="", nullable=False)  # Para reglas Commander
    oracle_text = Column(String, nullable=True)

    # Cotizaciones de Card Kingdom desnormalizadas para renderizado instantáneo
    cardkingdom_price_retail = Column(Numeric(10, 2), nullable=True)
    cardkingdom_price_buylist = Column(Numeric(10, 2), nullable=True)
    cardkingdom_price_foil = Column(Numeric(10, 2), nullable=True)

    # Relaciones del dominio
    instances_in_collections = relationship("UserCard", back_populates="card_catalog")
    price_history = relationship("HistoricoPrecio", back_populates="card_catalog", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_cartas_name_trgm', 'name', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'}),
    )