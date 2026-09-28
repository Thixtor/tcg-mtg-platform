# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: USUARIOS Y PERFIL P2P
# ---------------------------------------------------------
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr


# 1. Esquema base para registro y lectura simple
class UserBase(BaseModel):
    username: str
    email: EmailStr
    phone_number: str
    location: Optional[str] = "Medellín / Bello, Antioquia"


class UserCreate(UserBase):
    pass


# 2. Esquema de respuesta básica de usuario (requerido por __init__.py y auth.py)
class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    phone_number: str
    is_phone_verified: bool
    reputation_score: int
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# 3. Esquema para actualizar perfil y preferencias de trade
class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_currency: Optional[str] = None
    allows_local_meetup: Optional[bool] = None
    allows_nationwide_shipping: Optional[bool] = None


# 4. Métricas y KPIs de Inventario calculados
class UserProfileKPIs(BaseModel):
    active_binders: int
    max_binders: int = 10
    total_cards_in_collection: int
    cards_for_trade: int
    wishlist_wants: int


# 5. Resumen de Binder para la vista de perfil
class ProfileBinderSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_public_trade: bool = True
    card_count: int = 0
    art_url: Optional[str] = None

    class Config:
        from_attributes = True


# 6. Respuesta completa consolidada para ProfilePage.jsx
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

    # Preferencias P2P
    preferred_currency: str
    allows_local_meetup: bool
    allows_nationwide_shipping: bool

    # Reputación
    reputation_score: int
    rating: float
    completed_trades: int
    disputes_count: int

    # KPIs agregados
    kpis: UserProfileKPIs

    # Carpetas / Binders asociados
    binders: List[ProfileBinderSummary] = []

    class Config:
        from_attributes = True


# 7. Esquemas para OTP y Verificación Telefónica
class PhoneVerificationRequest(BaseModel):
    phone_number: str


class PhoneVerificationConfirm(BaseModel):
    code: str


# 8. Cargas útiles de verificación adicionales (compatibilidad con auth)
class RequestCodePayload(BaseModel):
    phone_number: str


class VerifyCodePayload(BaseModel):
    phone_number: str
    code: str