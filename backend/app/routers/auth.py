import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Importación de dependencias del núcleo
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, RequestCodePayload, VerifyCodePayload

router = APIRouter(
    prefix="/auth",
    tags=["Usuarios y Autenticación"]
)


# ---------------------------------------------------------
# 1. REGISTRO DE USUARIO
# ---------------------------------------------------------
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario",
    description="Crea la cuenta de usuario con número celular pendiente de verificación OTP."
)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db)
):
    # Validar si ya existe el username, email o número de celular
    existente = db.query(User).filter(
        (User.username == payload.username) |
        (User.email == payload.email) |
        (User.phone_number == payload.phone_number)
    ).first()

    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario registrado con ese username, email o número telefónico."
        )

    nuevo_usuario = User(
        username=payload.username,
        email=payload.email,
        phone_number=payload.phone_number,
        is_phone_verified=False,
        reputation_score=100
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


# ---------------------------------------------------------
# 2. SOLICITAR CÓDIGO OTP (SMS SIMULADO)
# ---------------------------------------------------------
@router.post(
    "/request-otp",
    summary="Solicitar código de verificación SMS/OTP",
    description="Genera y asigna un código numérico temporal de 6 dígitos al usuario."
)
def request_otp(
    payload: RequestCodePayload,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún usuario asociado a este número telefónico."
        )

    # Generación de código OTP simulado de 6 dígitos
    codigo_otp = str(random.randint(100000, 999999))
    usuario.verification_code = codigo_otp
    db.commit()

    # En un entorno de producción se conectaría con un proveedor de SMS (Twilio, AWS SNS, etc.)
    return {
        "message": "Código de verificación generado con éxito.",
        "phone_number": payload.phone_number,
        "dev_otp_code": codigo_otp  # Expuesto para facilitar pruebas durante desarrollo
    }


# ---------------------------------------------------------
# 3. VERIFICAR CÓDIGO OTP
# ---------------------------------------------------------
@router.post(
    "/verify-otp",
    summary="Verificar código OTP y validar identidad del usuario",
    description="Comprueba el código temporal. Si es correcto, marca la cuenta como verificada."
)
def verify_otp(
    payload: VerifyCodePayload,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    if not usuario.verification_code or usuario.verification_code != payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificación incorrecto o expirado."
        )

    # Confirmar verificación y limpiar código temporal
    usuario.is_phone_verified = True
    usuario.verification_code = None
    db.commit()

    return {
        "message": "Identidad telefónica verificada con éxito. Ya puedes publicar cartas para intercambio.",
        "user_id": usuario.id,
        "is_phone_verified": True
    }