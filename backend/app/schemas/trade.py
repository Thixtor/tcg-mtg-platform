# app/schemas/trade.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: MERCADO P2P, PROPUESTAS Y REPUTACIÓN
# ---------------------------------------------------------
from typing import Optional, List
from datetime import datetime
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


# ---------------------------------------------------------
# 3. ESQUEMAS DE PROPUESTAS DE TRADE (P2P PROPOSALS)
# ---------------------------------------------------------
class TradeProposalItemCreate(BaseModel):
    """Ítem a intercambiar en la propuesta."""
    user_card_id: str
    side: str = Field(..., pattern="^(offered|requested)$", description="'offered' si la da el proponente, 'requested' si la pide")
    quantity: int = Field(1, ge=1)
    agreed_price_usd: Optional[float] = Field(None, ge=0.0)


class TradeProposalCreatePayload(BaseModel):
    """Payload para enviar una propuesta de intercambio."""
    receiver_id: str
    items: List[TradeProposalItemCreate] = Field(..., min_length=1)
    cash_amount: float = Field(0.00, ge=0.0)
    cash_currency: str = Field("COP", max_length=5)
    cash_payer_id: Optional[str] = None
    notes: Optional[str] = None


class TradeProposalItemResponse(BaseModel):
    """Respuesta de un ítem dentro de una propuesta formal."""
    id: str
    user_card_id: str
    side: str
    quantity: int
    agreed_price_usd: Optional[float] = None
    card_name: Optional[str] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TradeProposalResponse(BaseModel):
    """Respuesta detallada del agregado de propuesta de trade."""
    id: str
    proposer_id: str
    receiver_id: str
    status: str
    cash_amount: float
    cash_currency: str
    cash_payer_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[TradeProposalItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# 4. ESQUEMA DE FEEDBACK Y REPUTACIÓN
# ---------------------------------------------------------
class TradeFeedbackPayload(BaseModel):
    """Calificación y reputación otorgada al concluir un intercambio."""
    rating: float = Field(..., ge=1.0, le=5.0, description="Calificación de 1.0 a 5.0 estrellas")
    comment: Optional[str] = Field(None, max_length=500)
    successful: bool = Field(True, description="True si la transacción se llevó a cabo satisfactoriamente")