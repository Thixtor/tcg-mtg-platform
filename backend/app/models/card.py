# app/models/card.py
from sqlalchemy import Column, String, Float, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# CATÁLOGO OFICIAL DE SCRYFALL (BASE DE REFERENCIA)
# ---------------------------------------------------------
class CartaScryfall(Base):
    """
    Catálogo maestro sincronizado con Scryfall.
    Almacena atributos clave indexados y el payload JSONB íntegro.
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
    oracle_text = Column(String, nullable=True)

    # Payload JSONB estructurado
    scryfall_raw_data = Column(JSONB, nullable=False)

    # Relaciones
    instances_in_collections = relationship("UserCard", back_populates="card_catalog")
    price_history = relationship("HistoricoPrecio", back_populates="card_catalog", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_cartas_name_trgm', 'name', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'}),
    )