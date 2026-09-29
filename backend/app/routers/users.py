# ---------------------------------------------------------
# ROUTER: USUARIOS, PERFIL P2P Y GESTIÓN DE JUGADORES
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.crud import crud_users
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


def _build_profile_payload(user: User, db: Session, is_owner: bool) -> dict:
    """Construye el diccionario base respetando tipos y valores 0 legítimos."""
    kpis, binders = crud_users.get_user_profile_aggregates(db, str(user.id), is_owner=is_owner)

    return {
        "id": str(user.id),
        "username": user.username,
        "avatar_url": str(user.avatar_url) if user.avatar_url else None,
        "bio": user.bio,
        "location": user.location,
        "created_at": user.created_at,
        "preferred_currency": getattr(user, 'preferred_currency', None) or "COP",
        "allows_local_meetup": user.allows_local_meetup if user.allows_local_meetup is not None else True,
        "allows_nationwide_shipping": user.allows_nationwide_shipping if user.allows_nationwide_shipping is not None else True,
        # Preservar valores 0 legítimos usando comprobación 'is not None'
        "reputation_score": user.reputation_score if user.reputation_score is not None else 100,
        "rating": user.rating if user.rating is not None else 5.0,
        "completed_trades": user.completed_trades if user.completed_trades is not None else 0,
        "disputes_count": user.disputes_count if user.disputes_count is not None else 0,
        "kpis": kpis,
        "binders": binders,
    }


# ---------------------------------------------------------
# 1. LISTAR USUARIOS (Protegido con JWT y Paginado contra DoS/Enumeración)
# ---------------------------------------------------------
@router.get("/", response_model=List[UserPublicSummary])
def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),  # Requiere login
    db: Session = Depends(get_db)
):
    """Lista jugadores con datos públicos y paginación controlada."""
    return (
        db.query(User)
        .order_by(User.username.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# ---------------------------------------------------------
# 2. OBTENER MI PROPIO PERFIL (Privado con email, teléfono y binders privados)
# ---------------------------------------------------------
@router.get("/me/profile", response_model=UserPrivateProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna los datos completos del usuario autenticado (incluye PII)."""
    data = _build_profile_payload(current_user, db, is_owner=True)
    data["email"] = current_user.email
    data["phone_number"] = current_user.phone_number
    data["is_phone_verified"] = current_user.is_phone_verified
    return UserPrivateProfileResponse(**data)


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
    target_user = crud_users.get_user_by_id(db, user_id=user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado."
        )

    # Si consulta su propio ID, se devuelven solo datos públicos según el contrato del endpoint
    data = _build_profile_payload(target_user, db, is_owner=(str(current_user.id) == str(target_user.id)))
    return UserPublicProfileResponse(**data)


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
    update_data = profile_in.model_dump(exclude_unset=True)

    if "avatar_url" in update_data and update_data["avatar_url"] is not None:
        update_data["avatar_url"] = str(update_data["avatar_url"])

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    data = _build_profile_payload(current_user, db, is_owner=True)
    data["email"] = current_user.email
    data["phone_number"] = current_user.phone_number
    data["is_phone_verified"] = current_user.is_phone_verified
    return UserPrivateProfileResponse(**data)