from pydantic import BaseModel


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