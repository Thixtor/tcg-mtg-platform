from typing import Optional, Any, Dict, List
from pydantic import BaseModel


# ---------------------------------------------------------
# 1. ESQUEMAS DE CARTAS (CATÁLOGO SCRYFALL)
# ---------------------------------------------------------
class CardResponse(BaseModel):
    id: str
    name: str
    set: Optional[str] = None
    type_line: Optional[str] = None
    mana_cost: Optional[str] = None
    image_url: Optional[str] = None
    scryfall_raw_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# 2. ESQUEMAS DE USUARIO Y AUTH
# ---------------------------------------------------------
class UserCreate(BaseModel):
    username: str
    email: str
    phone_number: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    phone_number: str
    is_phone_verified: bool
    reputation_score: int

    class Config:
        from_attributes = True


class RequestCodePayload(BaseModel):
    phone_number: str


class VerifyCodePayload(BaseModel):
    phone_number: str
    code: str


# ---------------------------------------------------------
# 3. ESQUEMAS DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# 4. ESQUEMAS DE CARTAS EN COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
class AddCardToCollectionPayload(BaseModel):
    scryfall_card_id: str
    quantity: int = 1
    condition: str = "NM"      # NM, LP, MP, HP, DMG
    language: str = "en"
    is_foil: bool = False
    is_for_trade: bool = False
    trade_notes: Optional[str] = None


class UserCardResponse(BaseModel):
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


# Esquema para el mercado público de intercambios
class TradeMarketItemResponse(BaseModel):
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