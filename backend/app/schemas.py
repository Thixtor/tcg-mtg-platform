from typing import Optional, Any, Dict
from pydantic import BaseModel

# Esquema de salida para enviar las cartas en formato JSON
class CardResponse(BaseModel):
    id: str
    name: str
    set: Optional[str] = None
    type_line: Optional[str] = None
    mana_cost: Optional[str] = None
    image_url: Optional[str] = None
    scryfall_raw_data: Optional[Dict[str, Any]] = None

    class Config:
        # Permite leer directamente las columnas del modelo SQLAlchemy
        from_attributes = True