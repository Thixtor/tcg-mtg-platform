# app/schemas/deck.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: MAZOS, CARTAS Y DISPONIBILIDAD CANÓNICA
# ---------------------------------------------------------
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------
# 1. ESQUEMAS DE MAZO (DECKS)
# ---------------------------------------------------------
class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Nombre del mazo")
    format: str = Field(default="Commander", max_length=50, description="Formato MTG")
    description: Optional[str] = Field(None, max_length=500, description="Descripción del mazo")
    cover_image_url: Optional[str] = Field(None, description="URL de arte de portada o comandante")


class DeckResponse(BaseModel):
    id: str
    user_id: str
    name: str
    format: str
    description: Optional[str] = None
    featured_card_id: Optional[str] = None
    cover_image_url: Optional[str] = None
    commander_image_url: Optional[str] = None
    commander_name: Optional[str] = None
    is_public: Optional[bool] = True
    total_cards: Optional[int] = 100
    likes_count: Optional[int] = 0
    upvotes_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


# ---------------------------------------------------------
# 2. ESQUEMAS DE MUTACIÓN DE CARTAS EN MAZO
# ---------------------------------------------------------
class AddCardToDeckPayload(BaseModel):
    scryfall_card_id: str
    quantity: int = Field(default=1, ge=1, le=99)
    category: str = Field(
        default="mainboard", 
        pattern=r"^(mainboard|sideboard|maybeboard|commander|companion)$"
    )


class UpdateDeckCardPayload(BaseModel):
    quantity: Optional[int] = Field(None, ge=1, le=99)
    category: Optional[str] = Field(
        None, 
        pattern=r"^(mainboard|sideboard|maybeboard|commander|companion)$"
    )


class BulkAddCardItem(BaseModel):
    scryfall_card_id: str
    quantity: int = Field(default=1, ge=1, le=99)
    category: str = Field(
        default="mainboard",
        pattern=r"^(mainboard|sideboard|maybeboard|commander|companion)$"
    )


class BulkAddCardsPayload(BaseModel):
    cards: List[BulkAddCardItem]


class BulkAddCardsResponse(BaseModel):
    message: str
    added_count: int
    failed_card_ids: List[str] = []


# ---------------------------------------------------------
# 3. DETALLE DE CARTA EN MAZO CON METADATOS CANÓNICOS
# ---------------------------------------------------------
class DeckCardDetailResponse(BaseModel):
    deck_card_id: str = "dc-default"
    scryfall_card_id: str = "card-default"
    name: str = "Desconocida"
    set_code: Optional[str] = None
    type_line: Optional[str] = None
    mana_cost: Optional[str] = None
    cmc: float = 0.0
    image_url: Optional[str] = None
    quantity_needed: int = 1
    category: Optional[str] = "mainboard"
    status: str = "DISPONIBLE"
    assigned_other_decks: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


# ---------------------------------------------------------
# 4. AUDITORÍA DE LEGALIDAD Y MÉTRICAS DE DOMINIO MTG
# ---------------------------------------------------------
class DeckLegalityResponse(BaseModel):
    is_legal: bool
    issues: List[str] = Field(default_factory=list)
    format: str
    total_cards: int
    average_cmc: float

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)