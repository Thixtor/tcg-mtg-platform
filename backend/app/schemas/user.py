# app/schemas/user.py
# ---------------------------------------------------------
# ESQUEMAS PYDANTIC: USUARIOS Y PERFIL P2P
# ---------------------------------------------------------
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


# ---------------------------------------------------------
# 1. ESQUEMAS BASE Y REGISTRO (ANTI-HOMOGLIFOS Y LOWERCASE)
# ---------------------------------------------------------
class UserBase(BaseModel):
    username: str = Field(
        min_length=3, 
        max_length=30, 
        pattern=r"^[a-zA-Z0-9_.-]+$",
        description="Nombre de usuario alfanumérico ASCII sin espacios ni caracteres especiales"
    )
    email: EmailStr
    # Teléfono opcional en registro; protegido hasta aceptación de un trade
    phone_number: Optional[str] = Field(
        None,
        pattern=r"^\+[1-9]\d{7,14}$",
        description="Formato internacional E.164 (ej: +573001234567)"
    )
    location: Optional[str] = Field("Medellín / Bello, Antioquia", max_length=100)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserCreate(UserBase):
    pass


# ---------------------------------------------------------
# 2. RESUMEN PÚBLICO (SIN PII)
# ---------------------------------------------------------
class UserPublicSummary(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    reputation_score: int
    rating: float
    completed_trades: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# 3. MÉTRICAS Y KPIS DE INVENTARIO
# ---------------------------------------------------------
class UserProfileKPIs(BaseModel):
    active_binders: int
    max_binders: int = 10
    total_cards_in_collection: int
    cards_for_trade: int
    wishlist_wants: int


# ---------------------------------------------------------
# 4. RESUMEN DE BINDERS
# ---------------------------------------------------------
class ProfileBinderSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_public_trade: bool = True
    card_count: int = 0
    art_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# 5. ACTUALIZACIÓN DE PERFIL PROPIO
# ---------------------------------------------------------
class UserProfileUpdate(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[HttpUrl] = None
    phone_number: Optional[str] = Field(None, pattern=r"^\+[1-9]\d{7,14}$")
    preferred_currency: Optional[str] = Field(None, pattern=r"^(COP|USD)$")
    allows_local_meetup: Optional[bool] = None
    allows_nationwide_shipping: Optional[bool] = None


# ---------------------------------------------------------
# 6. PERFIL PÚBLICO VISIBLE POR TERCEROS (ESTRICTAMENTE SIN EMAIL NI TELÉFONO)
# ---------------------------------------------------------
class UserPublicProfileResponse(BaseModel):
    id: str
    username: str
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


# ---------------------------------------------------------
# 7. PERFIL PRIVADO (Solo devuelto en /users/me/profile al propio dueño)
# ---------------------------------------------------------
class UserPrivateProfileResponse(UserPublicProfileResponse):
    email: EmailStr
    phone_number: Optional[str] = None
    is_phone_verified: bool


# ---------------------------------------------------------
# 8. ESQUEMAS OTP Y TOKEN POR CORREO ELECTRÓNICO
# ---------------------------------------------------------
class RequestCodePayload(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class VerifyCodePayload(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    phone_number: Optional[str] = None
    is_phone_verified: bool
    reputation_score: int
    rating: float
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse