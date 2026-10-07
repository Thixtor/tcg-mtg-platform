# app/schemas/trade_post.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: PUBLICACIONES Y CONVERSIÓN MONETARIA
# ---------------------------------------------------------
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class TradeCardItemSchema(BaseModel):
    """Detalle canónico o simplificado de carta en publicación."""
    name: str
    scryfall_id: Optional[str] = None
    edition: Optional[str] = "Cualquier edición"
    condition: Optional[str] = "NM"
    is_foil: bool = False
    image_url: Optional[str] = None
    note: Optional[str] = None
    market_price_usd: Optional[float] = 0.0


class TradePostCreatePayload(BaseModel):
    """Payload para publicar una nueva oferta en el Feed."""
    wanted_cards: List[TradeCardItemSchema] = Field(min_length=1)
    offered_cards: List[TradeCardItemSchema] = Field(min_length=1)
    notes: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = "Medellín, Antioquia"
    accepts_cash: bool = True
    preferred_usd_rate: int = Field(default=3200, ge=1000, le=10000)


class CashDifferenceCalculationRequest(BaseModel):
    """Cálculo automático de compensación monetaria en COP."""
    offered_usd_total: float
    requested_usd_total: float
    usd_to_cop_rate: int = 3200


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
    author: TradePostAuthorResponse
    wanted_cards: List[Dict[str, Any]]
    offered_cards: List[Dict[str, Any]]
    notes: Optional[str] = None
    location: str
    accepts_cash: bool
    preferred_usd_rate: int
    likes_count: int
    comments_count: int
    has_liked: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}