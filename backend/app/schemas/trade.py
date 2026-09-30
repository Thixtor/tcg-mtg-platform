# app/schemas/trade.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: MERCADO P2P Y MOTOR DE COINCIDENCIAS
# ---------------------------------------------------------
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------
# 1. ESQUEMAS DE INTERCAMBIO / TRADE MARKET PÚBLICO
# ---------------------------------------------------------
class TradeMarketItemResponse(BaseModel):
    user_card_id: str
    card_name: str
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    condition: str = "NM"
    language: str = "EN"
    is_foil: bool = False
    trade_notes: Optional[str] = None
    
    owner_username: str
    owner_reputation: int = 100

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


# ---------------------------------------------------------
# 2. ESQUEMAS DE MATCHMAKING P2P (CRUCE BIDIRECCIONAL)
# ---------------------------------------------------------
class MatchedCard(BaseModel):
    scryfall_card_id: str = "card-default"
    card_name: str = "Carta"
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    quantity: int = 1
    condition: Optional[str] = "NM"
    is_foil: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class TradeMatchUserResponse(BaseModel):
    user_id: str
    username: str
    reputation_score: int = 100
    is_mutual_match: bool = False
    they_have: List[MatchedCard] = Field(
        default_factory=list, 
        description="Cartas que la contraparte ofrece y están en mi Wishlist"
    )
    they_want: List[MatchedCard] = Field(
        default_factory=list, 
        description="Cartas que la contraparte busca y yo ofrezco en mis binders públicos"
    )

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)