# app/routers/auth.py
# ---------------------------------------------------------
# ROUTER: AUTENTICACIÓN Y SESIÓN (POO / DDD REFACTORED)
# ---------------------------------------------------------
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.core.limiter import limiter
from app.services.auth_service import AuthService
from app.schemas.user import (
    UserCreate, 
    UserResponse, 
    RequestCodePayload, 
    VerifyCodePayload, 
    TokenResponse
)

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación y Sesión"]
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario"
)
@limiter.limit("10/hour")
def register_user(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    """
    Crea un usuario controlando colisiones bajo concurrencia y protegido por rate limit.
    """
    try:
        return AuthService.register_user(db=db, payload=payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los datos proporcionados coinciden con una cuenta existente."
        )


@router.post(
    "/request-otp",
    summary="Solicitar código OTP de inicio de sesión"
)
@limiter.limit("5/minute")
def request_otp(request: Request, payload: RequestCodePayload, db: Session = Depends(get_db)):
    """
    Emite un código OTP con respuesta uniforme anti-enumeración.
    """
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
    """
    Valida el OTP y entrega credenciales JWT seguras.
    """
    return AuthService.verify_otp_and_login(db=db, payload=payload)