# app/routers/auth.py
# ============================================================================
# ROUTER: AUTENTICACIÓN, REGISTRO Y LOGIN DUAL (POO / DDD)
# ============================================================================
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field

from app.database import get_db
from app.core.limiter import limiter
from app.services.auth_service import AuthService
from app.models.user import User
from app.schemas.user import (
    UserCreate, 
    UserResponse, 
    RequestCodePayload, 
    VerifyCodePayload, 
    PasswordLoginPayload,
    TokenResponse
)

router: APIRouter = APIRouter(
    prefix="/auth",
    tags=["Autenticación y Sesión"]
)


# ----------------------------------------------------------------------------
# ESQUEMAS AUXILIARES LOCALES
# ----------------------------------------------------------------------------
class VerifyEmailOtpPayload(BaseModel):
    user_id: str = Field(..., description="ID único del usuario (UUID)")
    code: str = Field(..., min_length=6, max_length=6, description="Código OTP de 6 dígitos")


class ResendVerificationPayload(BaseModel):
    user_id: str = Field(..., description="ID único del usuario (UUID)")


class RegisterSuccessResponse(BaseModel):
    user: UserResponse
    is_resumed: bool
    message: str
    dev_otp_code: Optional[str] = None


# ----------------------------------------------------------------------------
# ENDPOINTS DE REGISTRO Y VERIFICACIÓN
# ----------------------------------------------------------------------------
@router.post(
    "/register",
    response_model=RegisterSuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario o reanudar registro pendiente"
)
@limiter.limit("10/hour")
def register_user(
    request: Request,
    payload: UserCreate,
    db: Session = Depends(get_db)
) -> RegisterSuccessResponse:
    """Crea una cuenta o reanuda una no verificada y despacha el código OTP por correo."""
    try:
        user_entity, is_resumed, dev_otp = AuthService.register_user(db=db, payload=payload)

        action_msg: str = (
            "Registro reanudado. Te hemos enviado un nuevo código de activación."
            if is_resumed
            else "Cuenta registrada. Te hemos enviado el código de activación."
        )

        return RegisterSuccessResponse(
            user=user_entity,
            is_resumed=is_resumed,
            message=action_msg,
            dev_otp_code=dev_otp
        )
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los datos proporcionados coinciden con una cuenta existente y verificada."
        )
    except ValueError as val_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


@router.post(
    "/resend-verification-otp",
    summary="Reenviar código OTP de activación con cooldown de 60 segundos"
)
@limiter.limit("10/minute")
def resend_verification_otp(
    request: Request,
    payload: ResendVerificationPayload,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Reenvía el código OTP a una cuenta registrada aún no verificada."""
    message, email, dev_otp = AuthService.resend_verification_code(db=db, user_id=payload.user_id)

    response_data: Dict[str, Any] = {
        "status": "success",
        "message": message,
        "email": email
    }
    if dev_otp:
        response_data["dev_otp_code"] = dev_otp

    return response_data


@router.post(
    "/verify-email-otp",
    summary="Verificar código OTP y activar cuenta tras registro"
)
@limiter.limit("10/minute")
def verify_email_otp(
    request: Request,
    payload: VerifyEmailOtpPayload,
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Valida el OTP enviado por correo electrónico y activa la cuenta."""
    user: Optional[User] = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    if not user.verify_otp(code=payload.code):
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código incorrecto, expirado o intentos máximos superados."
        )

    user.mark_email_as_verified()
    db.commit()
    return {"status": "success", "message": "Cuenta y correo verificados exitosamente."}


# ----------------------------------------------------------------------------
# ENDPOINTS DE INICIO DE SESIÓN
# ----------------------------------------------------------------------------
@router.post(
    "/request-otp",
    summary="Solicitar código OTP de inicio de sesión por correo"
)
@limiter.limit("5/minute")
def request_otp(
    request: Request,
    payload: RequestCodePayload,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Genera y remite un OTP para inicio de sesión sin contraseña."""
    response_payload, dev_code = AuthService.request_otp(db=db, payload=payload)
    if dev_code:
        response_payload["dev_otp_code"] = dev_code
    return response_payload


@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    summary="Verificar OTP y generar JWT"
)
@limiter.limit("10/minute")
def verify_otp(
    request: Request,
    payload: VerifyCodePayload,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Verifica el OTP de login y retorna el token JWT de acceso."""
    return AuthService.verify_otp_and_login(db=db, payload=payload)


@router.post(
    "/login-password",
    response_model=TokenResponse,
    summary="Iniciar sesión con Correo y Contraseña"
)
@limiter.limit("10/minute")
def login_with_password(
    request: Request,
    payload: PasswordLoginPayload,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Valida credenciales clásicas (email + contraseña) y retorna el token JWT."""
    return AuthService.login_with_password(db=db, payload=payload)