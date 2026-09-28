from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# 5. ESQUEMAS DE MAZOS (DECKS)
# ---------------------------------------------------------
class DeckCreate(BaseModel):
    """Creación de un nuevo mazo."""
    name: str = Field(min_length=1, max_length=100)
    format: str = Field("Commander", max_length=50)
    description: Optional[str] = Field(None, max_length=500)


class DeckResponse(BaseModel):
    """Información general de un mazo creado."""
    id: str
    user_id: str
    name: str
    format: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class AddCardToDeckPayload(BaseModel):
    """Agregar cartas a la estructura de un mazo."""
    scryfall_card_id: str
    quantity: int = Field(1, ge=1, le=99)
    category: Literal["commander", "mainboard", "sideboard", "maybeboard"] = "mainboard"


class DeckCardDetailResponse(BaseModel):
    """Estado de disponibilidad física de cada carta requerida en el mazo."""
    deck_card_id: str
    scryfall_card_id: str
    name: str
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    quantity_needed: int
    category: str
    status: Literal["DISPONIBLE", "EN_OTRO_MAZO", "FALTANTE"]
    assigned_other_decks: List[str] = []

    model_config = {"from_attributes": True}    