from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# 1. ESQUEMAS DE MAZOS (DECKS)
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
    category: Literal["commander", "companion", "mainboard", "sideboard", "maybeboard"] = "mainboard"


class UpdateDeckCardPayload(BaseModel):
    """Actualización puntual de cantidad o ubicación de una carta en el mazo."""
    quantity: Optional[int] = Field(None, ge=1, le=99)
    category: Optional[Literal["commander", "companion", "mainboard", "sideboard", "maybeboard"]] = None


class DeckCardDetailResponse(BaseModel):
    """Estado de disponibilidad física y metadatos de cada carta en el mazo."""
    deck_card_id: str
    scryfall_card_id: str
    name: str
    set_code: Optional[str] = None
    type_line: Optional[str] = None  # Crucial para la clasificación canónica por tipo
    mana_cost: Optional[str] = None  # Crucial para renderizar ManaCostSymbols.jsx
    cmc: Optional[float] = None      # Crucial para la curva de maná en DecksPage
    image_url: Optional[str] = None
    quantity_needed: int
    category: str
    status: Literal["DISPONIBLE", "EN_OTRO_MAZO", "FALTANTE"]
    assigned_other_decks: List[str] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# 2. ESQUEMAS PARA IMPORTACIÓN EN LOTE (BULK IMPORT)
# ---------------------------------------------------------
class BulkAddCardsPayload(BaseModel):
    """Lote de cartas a registrar en un mazo."""
    cards: List[AddCardToDeckPayload] = Field(..., min_length=1, max_length=200)


class BulkAddCardsResponse(BaseModel):
    """Resumen de ejecución de importación en lote."""
    message: str
    added_count: int
    failed_card_ids: List[str] = []