# app/schemas/collection.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: BINDERS, CARTAS DE USUARIO Y BÚSQUEDA
# ---------------------------------------------------------
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.card import CardResponse


# ---------------------------------------------------------
# 1. ESQUEMAS DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
class CollectionCreate(BaseModel):
    """Creación de carpetas o binders de inventario (hasta 10 por usuario)."""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class CollectionResponse(BaseModel):
    """Metadatos de una colección o carpeta de cartas."""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# 2. ESQUEMAS DE CARTAS EN COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
class AddCardToCollectionPayload(BaseModel):
    """Añadir una copia física de una carta a un binder."""
    scryfall_card_id: str
    quantity: int = Field(1, ge=1, le=999)
    condition: str = "NM"      # NM, LP, MP, HP, DMG
    language: str = "en"
    is_foil: bool = False
    is_for_trade: bool = False
    trade_notes: Optional[str] = Field(None, max_length=300)


class UserCardResponse(BaseModel):
    """Detalle de una carta física registrada en el inventario del usuario."""
    id: str
    collection_id: str
    scryfall_card_id: str
    quantity: int
    condition: str
    language: str
    is_foil: bool
    is_for_trade: bool
    trade_notes: Optional[str] = None
    card_catalog: Optional[CardResponse] = None

    model_config = {"from_attributes": True}


class TradeMarketItemResponse(BaseModel):
    """Elemento expuesto en el muro global de intercambio disponible."""
    user_card_id: str
    card_name: str
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    condition: str
    language: str
    is_foil: bool
    trade_notes: Optional[str] = None
    owner_username: str
    owner_reputation: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# 3. ESQUEMAS DE BÚSQUEDA DE INVENTARIO
# ---------------------------------------------------------
class UserCardSearchItem(BaseModel):
    """Detalle de carta física en inventario enriquecida con metadatos MTG."""
    id: str
    collection_id: str
    collection_name: str
    quantity: int
    condition: str
    language: str
    is_foil: bool
    is_for_trade: bool
    trade_notes: Optional[str] = None
    scryfall_card_id: str
    card_name: str
    type_line: Optional[str] = None
    color_identity: Optional[str] = None
    cmc: Optional[float] = None

    model_config = {"from_attributes": True}


class UserCardSearchResponse(BaseModel):
    """Respuesta paginada para la búsqueda en inventario."""
    total: int
    page: int
    limit: int
    items: List[UserCardSearchItem]