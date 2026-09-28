# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: USUARIOS Y PERFIL P2P
# ---------------------------------------------------------
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# 1. Esquema base para registro y lectura simple
class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[\w.-]+$")
    email: EmailStr
    phone_number: str = Field(pattern=r"^\+[1-9]\d{7,14}$", description="Formato internacional E.164 (ej: +573001234567)")
    location: Optional[str] = Field("Medellín / Bello, Antioquia", max_length=100)


class UserCreate(UserBase):
    pass


# 2. Esquema de respuesta pública (NO expone teléfono ni email a desconocidos)
class UserPublicSummary(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    reputation_score: int
    rating: float
    completed_trades: int

    model_config = {"from_attributes": True}


# 3. Esquema de respuesta privada completa (Solo para el propio usuario autenticado)
class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    phone_number: str
    is_phone_verified: bool
    reputation_score: int
    rating: float
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# 4. Esquema para actualizar perfil y preferencias de trade
class UserProfileUpdate(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    preferred_currency: Optional[str] = Field(None, pattern=r"^(COP|USD)$")
    allows_local_meetup: Optional[bool] = None
    allows_nationwide_shipping: Optional[bool] = None


# 5. Métricas y KPIs de Inventario
class UserProfileKPIs(BaseModel):
    active_binders: int
    max_binders: int = 10
    total_cards_in_collection: int
    cards_for_trade: int
    wishlist_wants: int


# 6. Resumen de Binder
class ProfileBinderSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_public_trade: bool = True
    card_count: int = 0
    art_url: Optional[str] = None

    model_config = {"from_attributes": True}


# 7. Respuesta consolidada de perfil propio
class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    phone_number: str
    is_phone_verified: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None

    preferred_currency: str
    allows_local_meetup: bool
    allows_nationwide_shipping: bool

    reputation_score: int
    rating: float
    completed_trades: int
    disputes_count: int

    kpis: UserProfileKPIs
    binders: List[ProfileBinderSummary] = []

    model_config = {"from_attributes": True}


# 8. Esquemas OTP y Token
class RequestCodePayload(BaseModel):
    phone_number: str = Field(pattern=r"^\+[1-9]\d{7,14}$")


class VerifyCodePayload(BaseModel):
    phone_number: str = Field(pattern=r"^\+[1-9]\d{7,14}$")
    code: str = Field(min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse