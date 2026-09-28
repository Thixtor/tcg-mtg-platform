# ---------------------------------------------------------
# ROUTER: USUARIOS, PERFIL P2P Y GESTIÓN DE JUGADORES
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, Collection, UserCard

try:
    from app.models import WishlistItem
except ImportError:
    WishlistItem = None

from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    UserProfileKPIs,
    ProfileBinderSummary,
    UserPublicSummary,
)

router = APIRouter(
    prefix="/users",
    tags=["Usuarios y Perfil"]
)


def _build_profile_response(user: User, db: Session) -> UserProfileResponse:
    """Helper interno para construir los KPIs y binders de un usuario."""
    user_collections = db.query(Collection).filter(Collection.user_id == user.id).all()
    collection_ids = [c.id for c in user_collections]

    total_cards = 0
    cards_for_trade = 0

    if collection_ids:
        total_cards = int(
            db.query(func.coalesce(func.sum(UserCard.quantity), 0))
            .filter(UserCard.collection_id.in_(collection_ids))
            .scalar() or 0
        )
        cards_for_trade = int(
            db.query(func.coalesce(func.sum(UserCard.quantity), 0))
            .filter(UserCard.collection_id.in_(collection_ids), UserCard.is_for_trade == True)
            .scalar() or 0
        )

    wishlist_wants = 0
    if WishlistItem:
        wishlist_wants = db.query(WishlistItem).filter(WishlistItem.user_id == user.id).count()

    binders_summary = []
    for c in user_collections:
        cards_in_binder = db.query(func.coalesce(func.sum(UserCard.quantity), 0)).filter(
            UserCard.collection_id == c.id
        ).scalar() or 0
        binders_summary.append(
            ProfileBinderSummary(
                id=c.id,
                name=c.name,
                description=c.description,
                is_public_trade=getattr(c, 'is_public_trade', True),
                card_count=int(cards_in_binder),
                art_url=getattr(c, 'art_url', None) or "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60"
            )
        )

    kpis = UserProfileKPIs(
        active_binders=len(user_collections),
        max_binders=10,
        total_cards_in_collection=total_cards,
        cards_for_trade=cards_for_trade,
        wishlist_wants=wishlist_wants
    )

    return UserProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        phone_number=user.phone_number,
        is_phone_verified=user.is_phone_verified,
        avatar_url=user.avatar_url,
        bio=user.bio,
        location=user.location,
        created_at=user.created_at,
        preferred_currency=user.preferred_currency or "COP",
        allows_local_meetup=user.allows_local_meetup if user.allows_local_meetup is not None else True,
        allows_nationwide_shipping=user.allows_nationwide_shipping if user.allows_nationwide_shipping is not None else True,
        reputation_score=user.reputation_score or 100,
        rating=user.rating or 5.0,
        completed_trades=user.completed_trades or 0,
        disputes_count=user.disputes_count or 0,
        kpis=kpis,
        binders=binders_summary
    )


# ---------------------------------------------------------
# 1. LISTAR USUARIOS PÚBLICOS (Sin filtrar PII)
# ---------------------------------------------------------
@router.get("/", response_model=List[UserPublicSummary])
def list_users(db: Session = Depends(get_db)):
    """Lista jugadores con datos públicos (evita fugas de teléfono y correo)."""
    return db.query(User).all()


# ---------------------------------------------------------
# 2. OBTENER MI PROPIO PERFIL (Autenticado vía JWT)
# ---------------------------------------------------------
@router.get("/me/profile", response_model=UserProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retorna los datos completos del usuario autenticado."""
    return _build_profile_response(current_user, db)


# ---------------------------------------------------------
# 3. OBTENER PERFIL POR ID (Lectura para ver a otro trader)
# ---------------------------------------------------------
@router.get("/{user_id}/profile", response_model=UserProfileResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """Consulta el perfil de un trader por su ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado."
        )
    return _build_profile_response(user, db)


# ---------------------------------------------------------
# 4. ACTUALIZAR MI PROPIO PERFIL (Blindado contra IDOR)
# ---------------------------------------------------------
@router.put("/me/profile", response_model=UserProfileResponse)
def update_my_profile(
    profile_in: UserProfileUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Actualiza datos del perfil del usuario actualmente autenticado."""
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return _build_profile_response(current_user, db)