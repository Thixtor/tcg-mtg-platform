from typing import Optional, Dict, Any
from pydantic import BaseModel


# ---------------------------------------------------------
# 1. ESQUEMAS DE CARTAS (CATÁLOGO SCRYFALL)
# ---------------------------------------------------------
class CardResponse(BaseModel):
    """Representación de una carta individual del catálogo para búsquedas y detalles."""
    id: str
    name: str
    set: Optional[str] = None
    type_line: Optional[str] = None
    mana_cost: Optional[str] = None
    image_url: Optional[str] = None
    scryfall_raw_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        orm_mode = True