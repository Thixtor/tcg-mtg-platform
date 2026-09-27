import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, RequestCodePayload, VerifyCodePayload
from app.crud import crud_users

router = APIRouter(
    prefix="/auth",
    tags=["Usuarios y Autenticación"]
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


@router.post("/request-otp", summary="Solicitar código OTP")
def request_otp(payload: RequestCodePayload, db: Session = Depends(get_db)):
    usuario = crud_users.get_user_by_phone(db, phone_number=payload.phone_number)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún usuario asociado a este número telefónico."
        )
    codigo_otp = str(random.randint(100000, 999999))
    crud_users.set_user_otp_code(db, user=usuario, code=codigo_otp)
    return {
        "message": "Código de verificación generado con éxito.",
        "phone_number": payload.phone_number,
        "dev_otp_code": codigo_otp
    }


@router.post("/verify-otp", summary="Verificar código OTP")
def verify_otp(payload: VerifyCodePayload, db: Session = Depends(get_db)):
    usuario = crud_users.get_user_by_phone(db, phone_number=payload.phone_number)
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
    crud_users.mark_phone_as_verified(db, user=usuario)
    return {
        "message": "Identidad telefónica verificada con éxito. Ya puedes publicar cartas para intercambio.",
        "user_id": usuario.id,
        "is_phone_verified": True
    }