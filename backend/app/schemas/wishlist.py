# app/schemas/wishlist.py
# ---------------------------------------------------------
# ESQUEMAS DE WISHLIST Y MOTOR DE MATCHMAKING
# ---------------------------------------------------------
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.card import CardResponse


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


# ---------------------------------------------------------
# ESQUEMAS PARA RANKING DE CARTAS MÁS BUSCADAS (MOST WANTED)
# ---------------------------------------------------------
class MostWantedCardItem(BaseModel):
    """Carta dentro del ranking comunitario según demanda en Wishlists."""
    scryfall_card_id: str
    card_name: str
    type_line: Optional[str] = None
    color_identity: Optional[str] = None
    cmc: Optional[float] = None
    users_count: int               # Cantidad de usuarios únicos que la buscan
    total_copies_wanted: int       # Suma de copias totales solicitadas

    model_config = {"from_attributes": True}


class MostWantedResponse(BaseModel):
    """Respuesta del ranking de cartas más demandadas."""
    total: int
    items: List[MostWantedCardItem]