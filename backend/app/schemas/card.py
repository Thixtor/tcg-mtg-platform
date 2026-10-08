# app/schemas/card.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: CATÁLOGO, BUSCADOR Y PRECIOS DE MERCADO
# ---------------------------------------------------------
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class CardSummary(BaseModel):
    """Esquema ligero para búsquedas, listados, catálogo y binders (Sin JSONB pesado)."""
    id: str
    name: str
    set: Optional[str] = None
    type_line: Optional[str] = None
    mana_cost: Optional[str] = None
    cmc: Optional[float] = None
    image_url: Optional[str] = None
    
    # Cotizaciones de referencia
    cardkingdom_price_retail: Optional[float] = None
    cardkingdom_price_buylist: Optional[float] = None
    cardkingdom_price_foil: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class CardDetail(CardSummary):
    """Esquema extendido solo para detalle individual GET /cards/{id}."""
    oracle_text: Optional[str] = None
    rarity: Optional[str] = None
    scryfall_raw_data: Optional[Dict[str, Any]] = None


class CardResponse(CardDetail):
    """Mantenido por retrocompatibilidad."""
    pass


class SimilarCardItem(BaseModel):
    id: str
    name: str
    mana_cost: Optional[str] = None
    type_line: Optional[str] = None
    image_url: Optional[str] = None
    rarity: Optional[str] = None
    set: Optional[str] = None
    similarity_reason: str
    current_price_usd: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class SimilarCardsResponse(BaseModel):
    base_card_id: str
    base_card_name: str
    matched_role: str
    similar_cards: List[SimilarCardItem]