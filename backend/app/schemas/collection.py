from typing import Optional
from pydantic import BaseModel
from app.schemas.card import CardResponse


# ---------------------------------------------------------
# 3. ESQUEMAS DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
class CollectionCreate(BaseModel):
    """Creación de carpetas o binders de inventario (hasta 10 por usuario)."""
    name: str
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    """Metadatos de una colección o carpeta de cartas."""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


# ---------------------------------------------------------
# 4. ESQUEMAS DE CARTAS EN COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
class AddCardToCollectionPayload(BaseModel):
    """Añadir una copia física de una carta a un binder."""
    scryfall_card_id: str
    quantity: int = 1
    condition: str = "NM"      # NM, LP, MP, HP, DMG
    language: str = "en"
    is_foil: bool = False
    is_for_trade: bool = False
    trade_notes: Optional[str] = None


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

    class Config:
        from_attributes = True
        orm_mode = True


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
    owner_phone: str
    owner_reputation: int

    class Config:
        from_attributes = True
        orm_mode = True