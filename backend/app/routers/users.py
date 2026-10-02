# app/routers/users.py
# ---------------------------------------------------------
# ROUTER: USUARIOS, PERFIL P2P Y GESTIÓN DE JUGADORES (POO / DDD)
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.user_service import UserService
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


# ---------------------------------------------------------
# 1. LISTAR USUARIOS (Protegido con JWT y Paginado)
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
# 2. OBTENER MI PROPIO PERFIL (Privado con email, teléfono y binders)
# ---------------------------------------------------------
@router.get("/me/profile", response_model=UserPrivateProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna los datos completos del usuario autenticado (incluye PII)."""
    return UserService.get_private_profile(db=db, user=current_user)


# ---------------------------------------------------------
# 3. OBTENER PERFIL PÚBLICO POR ID (Sin PII y solo binders públicos)
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
# 4. ACTUALIZAR MI PROPIO PERFIL (Blindado contra IDOR)
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