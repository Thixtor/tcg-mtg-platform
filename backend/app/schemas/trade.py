from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# 1. ESQUEMAS DE INTERCAMBIO / TRADE MARKET
# ---------------------------------------------------------
class TradeMarketItemResponse(BaseModel):
    user_card_id: str
    card_name: str
    set_code: str
    image_url: Optional[str] = None
    condition: str
    language: str
    is_foil: bool
    trade_notes: Optional[str] = None
    
    # Datos públicos del usuario (SE ELIMINÓ owner_phone)
    owner_username: str
    owner_reputation: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# 2. ESQUEMAS DE MATCHMAKING P2P
# ---------------------------------------------------------
class TradeMatchCardItem(BaseModel):
    scryfall_card_id: str
    card_name: str
    set_code: str
    image_url: Optional[str] = None
    quantity: int
    condition: Optional[str] = "NM"
    is_foil: Optional[bool] = False

    model_config = {"from_attributes": True}


class TradeMatchUserResponse(BaseModel):
    user_id: str
    username: str
    reputation_score: int
    rating: float
    location: Optional[str] = None
    # SE ELIMINÓ phone_number para evitar scraping directo.
    # El teléfono solo se comparte tras aceptar una propuesta formal.
    cards_offered: List[TradeMatchCardItem] = []
    cards_wanted: List[TradeMatchCardItem] = []

    model_config = {"from_attributes": True}