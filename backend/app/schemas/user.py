# app/schemas/user.py
# ============================================================================
# ESQUEMAS PYDANTIC: USUARIOS, AUTENTICACIÓN Y PERFIL P2P (PYDANTIC V2)
# ============================================================================
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator, ConfigDict


# ---------------------------------------------------------
# 1. ESQUEMAS BASE Y REGISTRO
# ---------------------------------------------------------
class UserBase(BaseModel):
    username: str = Field(
        ...,
        min_length=3, 
        max_length=30, 
        pattern=r"^[a-zA-Z0-9_.-]+$",
        description="Nombre de usuario alfanumérico ASCII"
    )
    email: EmailStr = Field(..., description="Correo electrónico del usuario")
    phone_number: Optional[str] = Field(default=None, pattern=r"^\+[1-9]\d{7,14}$")
    location: Optional[str] = Field(default="Medellín / Bello, Antioquia", max_length=100)
    password: Optional[str] = Field(default=None, min_length=6, description="Contraseña opcional para inicio directo")

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
# 2. RESUMEN PÚBLICO
# ---------------------------------------------------------
class UserPublicSummary(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    reputation_score: int
    rating: float
    completed_trades: int

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# 5. ACTUALIZACIÓN DE PERFIL PROPIO
# ---------------------------------------------------------
class UserProfileUpdate(BaseModel):
    bio: Optional[str] = Field(default=None, max_length=500)
    location: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[HttpUrl] = None
    phone_number: Optional[str] = Field(default=None, pattern=r"^\+[1-9]\d{7,14}$")
    preferred_currency: Optional[str] = Field(default=None, pattern=r"^(COP|USD)$")
    allows_local_meetup: Optional[bool] = None
    allows_nationwide_shipping: Optional[bool] = None


# ---------------------------------------------------------
# 6. PERFIL PÚBLICO
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

    kpis: Optional[UserProfileKPIs] = None
    binders: List[ProfileBinderSummary] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# 7. PERFIL PRIVADO
# ---------------------------------------------------------
class UserPrivateProfileResponse(UserPublicProfileResponse):
    email: EmailStr
    phone_number: Optional[str] = None
    is_phone_verified: bool
    is_email_verified: bool = False


# ---------------------------------------------------------
# 8. ESQUEMAS OTP, LOGIN Y VERIFICACIÓN
# ---------------------------------------------------------
class RequestCodePayload(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class VerifyCodePayload(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, description="Código numérico OTP de 6 dígitos")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class VerifyEmailOtpPayload(BaseModel):
    user_id: str = Field(..., description="UUID del usuario registrado")
    code: str = Field(..., min_length=6, max_length=6, description="Código de 6 dígitos enviado por correo")


class PasswordLoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    phone_number: Optional[str] = None
    is_phone_verified: bool = False
    is_email_verified: bool = False
    reputation_score: int
    rating: float
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse