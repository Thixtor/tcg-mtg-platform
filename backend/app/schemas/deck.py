from typing import Optional, List
from pydantic import BaseModel


# ---------------------------------------------------------
# 5. ESQUEMAS DE MAZOS (DECKS)
# ---------------------------------------------------------
class DeckCreate(BaseModel):
    """Creación de un nuevo mazo."""
    name: str
    format: str = "Commander"
    description: Optional[str] = None


class DeckResponse(BaseModel):
    """Información general de un mazo creado."""
    id: str
    user_id: str
    name: str
    format: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


class AddCardToDeckPayload(BaseModel):
    """Agregar cartas a la estructura de un mazo."""
    scryfall_card_id: str
    quantity: int = 1
    category: str = "mainboard"  # commander, mainboard, sideboard, maybeboard


class DeckCardDetailResponse(BaseModel):
    """Estado de disponibilidad física de cada carta requerida en el mazo."""
    deck_card_id: str
    scryfall_card_id: str
    name: str
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    quantity_needed: int
    category: str
    status: str                         # DISPONIBLE, EN_OTRO_MAZO, FALTANTE
    assigned_other_decks: List[str] = []

    class Config:
        from_attributes = True
        orm_mode = True