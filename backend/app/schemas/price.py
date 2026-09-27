from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


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

    class Config:
        from_attributes = True
        orm_mode = True


class HistorialPreciosResponse(BaseModel):
    """Payload serializado para componentes visuales de series de tiempo."""
    scryfall_card_id: str
    tienda: str = Field(..., description="cardkingdom o tcgplayer")
    tipo: str = Field("normal", description="normal o foil")
    rango_dias: int
    puntos: List[PuntoPrecio] = Field(default_factory=list, description="Lista de puntos cronológicos")

    class Config:
        from_attributes = True
        