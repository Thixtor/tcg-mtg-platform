from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.card import CardResponse


# ---------------------------------------------------------
# 6. ESQUEMAS DE WISHLIST Y MOTOR DE MATCHMAKING
# ---------------------------------------------------------
class WishlistAddPayload(BaseModel):
    """Agregar una carta deseada a la lista de búsqueda."""
    scryfall_card_id: str
    quantity: int = Field(1, ge=1, le=999)
    priority: str = Field("media", max_length=20)  # alta, media, baja


class WishlistItemResponse(BaseModel):
    """Carta registrada dentro de la lista de deseos de un usuario."""
    id: str
    user_id: str
    scryfall_card_id: str
    quantity: int
    priority: str
    card_catalog: Optional[CardResponse] = None

    model_config = {"from_attributes": True}


class MatchedCard(BaseModel):
    """Carta individual coincidente en un cruce de intercambio."""
    scryfall_card_id: str
    card_name: str
    image_url: Optional[str] = None
    condition: Optional[str] = None
    is_foil: Optional[bool] = None

    model_config = {"from_attributes": True}


class TradeMatchUserResponse(BaseModel):
    """Resultado del motor de coincidencia entre dos usuarios."""
    user_id: str
    username: str
    # phone_number ELIMINADO para proteger la privacidad
    reputation_score: int
    they_have: List[MatchedCard]   # Lo que ellos ofrecen y tú buscas
    they_want: List[MatchedCard]   # Lo que tú ofreces y ellos buscan
    is_mutual_match: bool          # True si hay coincidencia bidireccional

    model_config = {"from_attributes": True}