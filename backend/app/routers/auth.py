# app/routers/auth.py
# ============================================================================
# ROUTER: AUTENTICACIÓN, REGISTRO Y LOGIN DUAL (POO / DDD)
# ============================================================================
import random
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.database import get_db
from app.core.limiter import limiter
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

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación y Sesión"]
)


class VerifyEmailOtpPayload(BaseModel):
    user_id: str
    code: str


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario y enviar código de activación"
)
@limiter.limit("10/hour")
def register_user(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    """Crea una cuenta y emite el código OTP de verificación de correo."""
    try:
        new_user = AuthService.register_user(db=db, payload=payload)
        
        otp_code = f"{random.randint(100000, 999999)}"
        otp_hash = _compute_otp_hash(otp_code, str(new_user.id))
        
        user_entity = db.query(User).filter(User.id == new_user.id).first()
        if user_entity:
            user_entity.register_otp_challenge(otp_hash, lifetime_minutes=10)
            db.commit()

        EmailService.send_verification_otp(
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


@router.post(
    "/verify-email-otp",
    summary="Verificar código OTP y activar cuenta tras registro"
)
@limiter.limit("10/minute")
def verify_email_otp(request: Request, payload: VerifyEmailOtpPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if not user.verify_otp(payload.code):
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
def request_otp(request: Request, payload: RequestCodePayload, db: Session = Depends(get_db)):
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
def verify_otp(request: Request, payload: VerifyCodePayload, db: Session = Depends(get_db)):
    return AuthService.verify_otp_and_login(db=db, payload=payload)


@router.post(
    "/login-password",
    response_model=TokenResponse,
    summary="Iniciar sesión con Correo y Contraseña"
)
@limiter.limit("10/minute")
def login_with_password(request: Request, payload: PasswordLoginPayload, db: Session = Depends(get_db)):
    return AuthService.login_with_password(db=db, payload=payload)