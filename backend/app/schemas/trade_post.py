# app/schemas/trade_post.py
# ============================================================================
# ESQUEMAS PYDANTIC: PUBLICACIONES Y MARKETPLACE P2P (MTG)
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Soporta publicaciones de solo venta (offered_cards con wanted_cards vacío),
#   solo compra (wanted_cards con offered_cards vacío) e intercambio mixto.
# - Flexibiliza los esquemas de cartas para aceptar price_usd o market_price_usd
#   y scryfall_card_id o scryfall_id.
# ============================================================================

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class TradeCardItemSchema(BaseModel):
    """Detalle de carta ofertada o requerida en una publicación."""
    name: str
    scryfall_id: Optional[str] = None
    scryfall_card_id: Optional[str] = None
    edition: Optional[str] = "Cualquier edición"
    condition: Optional[str] = "NM"
    is_foil: bool = False
    image_url: Optional[str] = None
    note: Optional[str] = None
    price_usd: Optional[float] = 0.0
    market_price_usd: Optional[float] = 0.0
    quantity: Optional[int] = 1


class TradePostCreatePayload(BaseModel):
    """Payload para publicar ofertas, compras o intercambios en el Black Market."""
    title: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = "Medellín, Antioquia"
    accepts_cash: bool = True
    cash_amount: Optional[float] = 0.0
    preferred_usd_rate: int = Field(default=3300, ge=500, le=20000)
    wanted_cards: List[TradeCardItemSchema] = Field(default_factory=list)
    offered_cards: List[TradeCardItemSchema] = Field(default_factory=list)


class CashDifferenceCalculationRequest(BaseModel):
    """Cálculo automático de compensación monetaria en COP."""
    offered_usd_total: float
    requested_usd_total: float
    usd_to_cop_rate: int = 3300


class CashDifferenceCalculationResponse(BaseModel):
    difference_usd: float
    cash_amount_cop: int
    payer: str  # 'proposer' | 'receiver' | 'even'
    explanation: str


class TradePostAuthorResponse(BaseModel):
    id: str
    username: str
    reputation_score: Optional[int] = 0
    is_verified: bool = True

    model_config = {"from_attributes": True}


class TradePostResponse(BaseModel):
    id: str
    author: Optional[TradePostAuthorResponse] = None
    wanted_cards: List[Dict[str, Any]] = Field(default_factory=list)
    offered_cards: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
    location: str = "Local"
    accepts_cash: bool = True
    preferred_usd_rate: int = 3300
    likes_count: int = 0
    comments_count: int = 0
    has_liked: bool = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}