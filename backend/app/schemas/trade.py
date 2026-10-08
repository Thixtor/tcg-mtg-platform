# app/schemas/trade.py
# ============================================================================
# ESQUEMAS PYDANTIC: MERCADO P2P, PROPUESTAS Y REPUTACIÓN (BLACK MARKET)
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Soporta tanto el formato tradicional con 'items' como el formato flexible
#   enviado por TradeProposalModal ('offered_card_ids', 'requested_cards', 'post_id').
# - Permite compra directa en efectivo (offered_card_ids vacío con cash_amount > 0).
# - Mantiene compatibilidad con el sistema de reputación y feedback de 5 estrellas.
# ============================================================================

from typing import Optional, List, Dict, Any
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
    """Ítem a intercambiar en la propuesta (modo binder)."""
    user_card_id: Optional[str] = None
    scryfall_id: Optional[str] = None
    card_name: Optional[str] = None
    side: str = Field(..., pattern="^(offered|requested)$", description="'offered' si la da el proponente, 'requested' si la pide")
    quantity: int = Field(1, ge=1)
    agreed_price_usd: Optional[float] = Field(None, ge=0.0)


class RequestedCardItem(BaseModel):
    """Carta solicitada proveniente de una publicación del muro."""
    name: str
    scryfall_id: Optional[str] = None
    condition: Optional[str] = "NM"
    price_usd: Optional[float] = 0.0
    quantity: Optional[int] = 1


class TradeProposalCreatePayload(BaseModel):
    """Payload polimórfico para enviar una propuesta de intercambio o compra."""
    receiver_id: str
    post_id: Optional[str] = None
    
    # Soporte formato flexible desde TradeProposalModal
    offered_card_ids: List[str] = Field(default_factory=list)
    requested_cards: List[RequestedCardItem] = Field(default_factory=list)
    
    # Soporte formato clásico
    items: List[TradeProposalItemCreate] = Field(default_factory=list)
    
    cash_amount: float = Field(0.00, ge=0.0)
    cash_currency: str = Field("COP", max_length=5)
    cash_payer_id: Optional[str] = None
    preferred_usd_rate: Optional[int] = 3200
    notes: Optional[str] = None


class TradeProposalItemResponse(BaseModel):
    """Respuesta de un ítem dentro de una propuesta formal."""
    id: str
    user_card_id: Optional[str] = None
    side: str
    quantity: int
    agreed_price_usd: Optional[float] = None
    card_name: Optional[str] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TradeProposalResponse(BaseModel):
    """Respuesta detallada de una propuesta de trade."""
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