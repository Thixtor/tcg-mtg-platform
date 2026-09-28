from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.config import settings
from app.core.security import generate_secure_otp, verify_otp_digest, create_access_token
from app.schemas.user import (
    UserCreate, 
    UserResponse, 
    RequestCodePayload, 
    VerifyCodePayload, 
    TokenResponse
)
from app.crud import crud_users

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
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existente = crud_users.get_user_by_unique_fields(
        db, 
        username=payload.username, 
        email=payload.email, 
        phone_number=payload.phone_number
    )
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario registrado con ese username, email o número telefónico."
        )
    return crud_users.create_user(db, payload=payload)


@router.post("/request-otp", summary="Solicitar código OTP de inicio de sesión o verificación")
def request_otp(payload: RequestCodePayload, db: Session = Depends(get_db)):
    usuario = crud_users.get_user_by_phone(db, phone_number=payload.phone_number)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún usuario asociado a este número telefónico."
        )

    codigo_otp = generate_secure_otp()
    crud_users.set_user_otp_code(db, user=usuario, code=codigo_otp)

    response_data = {
        "status": "success",
        "message": f"Código de verificación enviado al {payload.phone_number}."
    }

    # Solo en desarrollo exponemos el código o lo mostramos en consola
    if settings.ENVIRONMENT == "development":
        print(f"\n🔑 [DEV ONLY] OTP para {usuario.phone_number}: {codigo_otp}\n")
        response_data["dev_otp_code"] = codigo_otp

    return response_data


@router.post("/verify-otp", response_model=TokenResponse, summary="Verificar OTP y obtener Access Token")
def verify_otp(payload: VerifyCodePayload, db: Session = Depends(get_db)):
    usuario = crud_users.get_user_by_phone(db, phone_number=payload.phone_number)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    if not verify_otp_digest(usuario, payload.code):
        db.commit()  # Para guardar el incremento de otp_attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificación incorrecto, expirado o intentos máximos superados."
        )

    crud_users.mark_phone_as_verified(db, user=usuario)
    access_token = create_access_token(user_id=usuario.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": usuario
    }