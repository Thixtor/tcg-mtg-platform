# ---------------------------------------------------------
# SCHEMAS DE PYDANTIC PARA CARTAS Y CATÁLOGO
# ---------------------------------------------------------
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

# ---------------------------------------------------------
# 1. SCHEMA PRINCIPAL DE RESPUESTA DE CARTA
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
# 2. SCHEMA PARA CARTAS FUNCIONALMENTE SIMILARES
# ---------------------------------------------------------
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

    class Config:
        from_attributes = True


class SimilarCardsResponse(BaseModel):
    base_card_id: str
    base_card_name: str
    matched_role: str
    similar_cards: List[SimilarCardItem]