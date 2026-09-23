from sqlalchemy import Column, String, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class CartaScryfall(Base):
    __tablename__ = 'cartas'

    # Columnas relacionales indexadas para búsquedas eficientes
    id = Column(String, primary_key=True, index=True) # UUID de Scryfall
    name = Column(String, index=True, nullable=False)
    set = Column(String, index=True)
    type_line = Column(String)
    mana_cost = Column(String)
    image_url = Column(String)

    # Columna JSON para almacenar el objeto íntegro de la API
    scryfall_raw_data = Column(JSON, nullable=False)