from typing import Optional, Any, Dict
from pydantic import BaseModel  # <-- Quitamos EmailStr de aquí


# --- Esquemas de Cartas ---
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


# --- Esquemas de Usuario y Autenticación ---
class UserCreate(BaseModel):
    username: str
    email: str  # <-- Usamos str estándar en lugar de EmailStr
    phone_number: str  # Ejemplo: +573001234567


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    phone_number: str
    is_phone_verified: bool
    reputation_score: int

    class Config:
        from_attributes = True


class RequestCodePayload(BaseModel):
    phone_number: str


class VerifyCodePayload(BaseModel):
    phone_number: str
    code: str