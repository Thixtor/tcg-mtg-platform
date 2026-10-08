# app/routers/auth.py
# ============================================================================
# ROUTER: AUTENTICACIÓN, REGISTRO Y LOGIN DUAL (POO / DDD)
# ============================================================================
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field

from app.database import get_db
from app.core.limiter import limiter
from app.core.security import generate_secure_otp
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.models.user import User, _compute_otp_hash
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


class VerifyEmailOtpPayload(BaseModel):
    user_id: str = Field(..., description="ID único del usuario (UUID)")
    code: str = Field(..., min_length=6, max_length=6, description="Código OTP de 6 dígitos")


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario y enviar código de activación"
)
@limiter.limit("10/hour")
def register_user(
    request: Request,
    payload: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> UserResponse:
    """Crea una cuenta y emite el código OTP de verificación de correo en segundo plano."""
    try:
        new_user = AuthService.register_user(db=db, payload=payload)
        
        # Generación criptográficamente segura del código OTP de 6 dígitos
        otp_code: str = generate_secure_otp()
        otp_hash: str = _compute_otp_hash(code=otp_code, user_id=str(new_user.id))
        
        user_entity: Optional[User] = db.query(User).filter(User.id == new_user.id).first()
        if user_entity:
            user_entity.register_otp_challenge(otp_hash_digest=otp_hash, lifetime_minutes=10)
            db.commit()

        # Despacho en segundo plano para no demorar la respuesta HTTP
        background_tasks.add_task(
            EmailService.send_verification_otp,
            to_email=new_user.email,
            username=new_user.username,
            otp_code=otp_code,
            is_update=False
        )

        return new_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los datos proporcionados coinciden con una cuenta existente."
        )
    except ValueError as val_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


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
            detail="Código inválido o expirado."
        )

    user.mark_email_as_verified()
    db.commit()
    return {"status": "success", "message": "Cuenta y correo verificados exitosamente."}


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