# app/routers/users.py
# ============================================================================
# ROUTER: USUARIOS, PERFIL P2P Y CAMBIO DE CORREO (POO / DDD)
# ============================================================================
import random
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User, _compute_otp_hash
from app.services.user_service import UserService
from app.services.email_service import EmailService
from app.schemas.user import (
    UserPrivateProfileResponse,
    UserPublicProfileResponse,
    UserProfileUpdate,
    UserPublicSummary,
)

router = APIRouter(
    prefix="/users",
    tags=["Usuarios y Perfil"]
)


class RequestEmailChangePayload(BaseModel):
    new_email: EmailStr


class ConfirmEmailChangePayload(BaseModel):
    code: str


# ---------------------------------------------------------
# 1. LISTAR USUARIOS
# ---------------------------------------------------------
@router.get("/", response_model=List[UserPublicSummary])
def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista jugadores con datos públicos y paginación controlada."""
    return UserService.list_public_users(db=db, limit=limit, offset=offset)


# ---------------------------------------------------------
# 2. OBTENER MI PROPIO PERFIL
# ---------------------------------------------------------
@router.get("/me/profile", response_model=UserPrivateProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna los datos completos del usuario autenticado."""
    return UserService.get_private_profile(db=db, user=current_user)


# ---------------------------------------------------------
# 3. OBTENER PERFIL PÚBLICO POR ID
# ---------------------------------------------------------
@router.get("/{user_id}/profile", response_model=UserPublicProfileResponse)
def get_user_profile(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Consulta el perfil de otro trader sin filtrar PII."""
    return UserService.get_public_profile(
        db=db,
        target_user_id=user_id,
        requester_id=str(current_user.id)
    )


# ---------------------------------------------------------
# 4. ACTUALIZAR MI PROPIO PERFIL
# ---------------------------------------------------------
@router.put("/me/profile", response_model=UserPrivateProfileResponse)
def update_my_profile(
    profile_in: UserProfileUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Actualiza datos del perfil del usuario actualmente autenticado."""
    return UserService.update_profile(
        db=db,
        user=current_user,
        profile_in=profile_in
    )


# ---------------------------------------------------------
# 5. SOLICITAR CAMBIO DE CORREO ELECTRÓNICO (VERIFICACIÓN DOBLE)
# ---------------------------------------------------------
@router.post("/me/request-email-change", summary="Iniciar cambio de correo")
def request_email_change(
    payload: RequestEmailChangePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Genera un OTP y envía código de verificación al NUEVO correo electrónico."""
    new_email = payload.new_email.strip().lower()

    if new_email == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nuevo correo es idéntico a tu correo actual."
        )

    # Verificar colisión con otra cuenta
    existing = db.query(User).filter(User.email == new_email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este correo ya se encuentra en uso por otra cuenta."
        )

    otp_code = f"{random.randint(100000, 999999)}"
    otp_hash = _compute_otp_hash(otp_code, str(current_user.id))

    current_user.pending_email = new_email
    current_user.register_otp_challenge(otp_hash, lifetime_minutes=10)
    db.commit()

    EmailService.send_verification_otp(
        to_email=new_email,
        username=current_user.username,
        otp_code=otp_code,
        is_update=True
    )

    return {
        "status": "pending_verification",
        "message": f"Se ha enviado un código de verificación a {new_email}."
    }


# ---------------------------------------------------------
# 6. CONFIRMAR CAMBIO DE CORREO ELECTRÓNICO
# ---------------------------------------------------------
@router.post("/me/confirm-email-change", summary="Confirmar cambio de correo")
def confirm_email_change(
    payload: ConfirmEmailChangePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Valida el código OTP y actualiza formalmente la dirección de correo."""
    if not current_user.pending_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay ninguna solicitud de cambio de correo pendiente."
        )

    if not current_user.verify_otp(payload.code):
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido o expirado."
        )

    new_email = current_user.pending_email
    current_user.mark_email_as_verified()
    db.commit()

    return {
        "status": "success",
        "email": new_email,
        "message": "Correo electrónico actualizado y verificado exitosamente."
    }