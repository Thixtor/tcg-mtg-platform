import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

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
from app.models.user import User

logger = logging.getLogger("auth")

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
    """Crea un usuario controlando colisiones bajo concurrencia."""
    try:
        return crud_users.create_user(db, payload=payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario registrado con ese username, email o teléfono."
        )


@router.post("/request-otp", summary="Solicitar código OTP de inicio de sesión")
def request_otp(payload: RequestCodePayload, db: Session = Depends(get_db)):
    """
    Emite un código OTP si el número existe.
    Responde con el mismo mensaje genérico para evitar enumeración de usuarios.
    """
    # Bloqueo de fila para evitar condiciones de carrera en solicitudes simultáneas
    usuario = (
        db.query(User)
        .filter(User.phone_number == payload.phone_number)
        .with_for_update()
        .first()
    )

    dev_code = None
    if usuario and crud_users.can_issue_otp(usuario):
        codigo_otp = generate_secure_otp()
        crud_users.set_user_otp_code(db, user=usuario, code=codigo_otp)
        
        # Simulación de pasarela de SMS / Gateway
        logger.info(f"Enviando OTP a {payload.phone_number}")

        if settings.EXPOSE_DEV_OTP:
            dev_code = codigo_otp
            logger.warning(f"🔑 [DEV OTP] para {usuario.phone_number}: {codigo_otp}")

        # Imprimir en consola de desarrollo usando la variable correcta
        print(f"\n==========================================", flush=True)
        print(f" >>> [DEV OTP CODE]: {codigo_otp} <<< ", flush=True)
        print(f"==========================================\n", flush=True)

    response = {
        "status": "success",
        "message": "Si el número telefónico se encuentra registrado, recibirás un código de acceso."
    }

    if dev_code:
        response["dev_otp_code"] = dev_code

    return response


@router.post("/verify-otp", response_model=TokenResponse, summary="Verificar OTP y generar JWT")
def verify_otp(payload: VerifyCodePayload, db: Session = Depends(get_db)):
    """
    Valida el OTP con serialización de intentos en base de datos.
    """
    usuario = (
        db.query(User)
        .filter(User.phone_number == payload.phone_number)
        .with_for_update()
        .first()
    )

    if not usuario or not verify_otp_digest(usuario, payload.code):
        db.commit()  # Persistir el incremento de otp_attempts ejecutado en verify_otp_digest
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