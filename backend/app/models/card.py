from sqlalchemy import Column, String, JSON
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# 1. CATÁLOGO OFICIAL DE SCRYFALL (BASE DE REFERENCIA)
# ---------------------------------------------------------
class CartaScryfall(Base):
    """
    Catálogo maestro sincronizado localmente con Scryfall.
    Almacena atributos clave indexados y el payload JSON íntegro.
    """
    __tablename__ = 'cartas'

    id = Column(String, primary_key=True, index=True)  # UUID provisto por Scryfall
    name = Column(String, index=True, nullable=False)
    set = Column(String, index=True)
    type_line = Column(String)
    mana_cost = Column(String)
    image_url = Column(String)

    # Objeto JSON completo con legalidades, textos y atributos extendidos
    scryfall_raw_data = Column(JSON, nullable=False)

    # Relaciones bidireccionales
    instances_in_collections = relationship("UserCard", back_populates="card_catalog")
    price_history = relationship("HistoricoPrecio", back_populates="card_catalog", cascade="all, delete-orphan")