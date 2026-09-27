from datetime import date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# 1. ESQUEMAS DE CARTAS (CATÁLOGO SCRYFALL)
# ---------------------------------------------------------
class CardResponse(BaseModel):
    """Representación de una carta individual del catálogo para el buscador y listados."""
    id: str
    name: str
    set: Optional[str] = None
    type_line: Optional[str] = None
    mana_cost: Optional[str] = None
    image_url: Optional[str] = None
    scryfall_raw_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        orm_mode = True


# ---------------------------------------------------------
# 2. ESQUEMAS DE USUARIO Y AUTENTICACIÓN (OTP CELULAR)
# ---------------------------------------------------------
class UserCreate(BaseModel):
    """Payload para registro de un nuevo usuario en la plataforma."""
    username: str
    email: str
    phone_number: str


class UserResponse(BaseModel):
    """Datos públicos y de verificación del usuario."""
    id: str
    username: str
    email: str
    phone_number: str
    is_phone_verified: bool
    reputation_score: int

    class Config:
        from_attributes = True
        orm_mode = True


class RequestCodePayload(BaseModel):
    """Solicitud de emisión de código SMS/OTP de verificación."""
    phone_number: str


class VerifyCodePayload(BaseModel):
    """Validación del código temporal OTP ingresado por el usuario."""
    phone_number: str
    code: str


# ---------------------------------------------------------
# 3. ESQUEMAS DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
class CollectionCreate(BaseModel):
    """Creación de carpetas o binders de inventario (hasta 10 por usuario)."""
    name: str
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    """Metadatos de una colección o carpeta de cartas."""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


# ---------------------------------------------------------
# 4. ESQUEMAS DE CARTAS EN COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
class AddCardToCollectionPayload(BaseModel):
    """Añadir una copia física de una carta a un binder."""
    scryfall_card_id: str
    quantity: int = 1
    condition: str = "NM"      # NM, LP, MP, HP, DMG
    language: str = "en"
    is_foil: bool = False
    is_for_trade: bool = False
    trade_notes: Optional[str] = None


class UserCardResponse(BaseModel):
    """Detalle de una carta física registrada en el inventario del usuario."""
    id: str
    collection_id: str
    scryfall_card_id: str
    quantity: int
    condition: str
    language: str
    is_foil: bool
    is_for_trade: bool
    trade_notes: Optional[str] = None
    card_catalog: Optional[CardResponse] = None

    class Config:
        from_attributes = True
        orm_mode = True


class TradeMarketItemResponse(BaseModel):
    """Elemento expuesto en el muro global de intercambio disponible."""
    user_card_id: str
    card_name: str
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    condition: str
    language: str
    is_foil: bool
    trade_notes: Optional[str] = None
    owner_username: str
    owner_phone: str
    owner_reputation: int

    class Config:
        from_attributes = True
        orm_mode = True


# ---------------------------------------------------------
# 5. ESQUEMAS DE MAZOS (DECKS)
# ---------------------------------------------------------
class DeckCreate(BaseModel):
    """Creación de un nuevo mazo."""
    name: str
    format: str = "Commander"
    description: Optional[str] = None


class DeckResponse(BaseModel):
    """Información general de un mazo creado."""
    id: str
    user_id: str
    name: str
    format: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


class AddCardToDeckPayload(BaseModel):
    """Agregar cartas a la estructura de un mazo."""
    scryfall_card_id: str
    quantity: int = 1
    category: str = "mainboard"  # commander, mainboard, sideboard, maybeboard


class DeckCardDetailResponse(BaseModel):
    """Estado de disponibilidad física de cada carta requerida en el mazo."""
    deck_card_id: str
    scryfall_card_id: str
    name: str
    set_code: Optional[str] = None
    image_url: Optional[str] = None
    quantity_needed: int
    category: str
    status: str                         # DISPONIBLE, EN_OTRO_MAZO, FALTANTE
    assigned_other_decks: List[str] = []

    class Config:
        from_attributes = True
        orm_mode = True


# ---------------------------------------------------------
# 6. ESQUEMAS DE WISHLIST Y MOTOR DE MATCHMAKING
# ---------------------------------------------------------
class WishlistAddPayload(BaseModel):
    """Agregar una carta deseada a la lista de búsqueda."""
    scryfall_card_id: str
    quantity: int = 1
    priority: str = "media"  # alta, media, baja


class WishlistItemResponse(BaseModel):
    """Carta registrada dentro de la lista de deseos de un usuario."""
    id: str
    user_id: str
    scryfall_card_id: str
    quantity: int
    priority: str
    card_catalog: Optional[CardResponse] = None

    class Config:
        from_attributes = True
        orm_mode = True


class MatchedCard(BaseModel):
    """Carta individual coincidente en un cruce de intercambio."""
    scryfall_card_id: str
    card_name: str
    image_url: Optional[str] = None
    condition: Optional[str] = None
    is_foil: Optional[bool] = None

    class Config:
        from_attributes = True
        orm_mode = True


class TradeMatchUserResponse(BaseModel):
    """Resultado del motor de coincidencia entre dos usuarios."""
    user_id: str
    username: str
    phone_number: str
    reputation_score: int
    they_have: List[MatchedCard]   # Lo que ellos ofrecen y tú buscas
    they_want: List[MatchedCard]   # Lo que tú ofreces y ellos buscan
    is_mutual_match: bool          # True si hay coincidencia bidireccional

    class Config:
        from_attributes = True
        orm_mode = True


# ---------------------------------------------------------
# 7. ESQUEMAS DE PRECIOS Y ANALÍTICA HISTÓRICA
# ---------------------------------------------------------
class PuntoPrecio(BaseModel):
    """Coordenada puntual (fecha y valor en USD) para renderizar gráficas de línea."""
    fecha: date = Field(..., description="Fecha de corte del precio")
    precio_usd: float = Field(..., description="Precio registrado en dólares USD")

    class Config:
        from_attributes = True
        orm_mode = True


class ResumenPreciosActuales(BaseModel):
    """Precios más recientes por tienda para la ficha de detalle y cálculo de trade."""
    scryfall_card_id: str
    cardkingdom_usd: Optional[float] = None
    cardkingdom_foil_usd: Optional[float] = None
    tcgplayer_usd: Optional[float] = None
    tcgplayer_foil_usd: Optional[float] = None


class HistorialPreciosResponse(BaseModel):
    """Payload serializado para componentes visuales de series de tiempo (ej. Recharts)."""
    scryfall_card_id: str
    tienda: str = Field(..., description="cardkingdom o tcgplayer")
    tipo: str = Field("normal", description="normal o foil")
    rango_dias: int
    puntos: List[PuntoPrecio] = Field(default_factory=list, description="Lista de puntos cronológicos")