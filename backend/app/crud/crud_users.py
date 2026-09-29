from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.user import User
from app.models.collection import Collection
from app.models.user_card import UserCard
from app.models.wishlist import WishlistItem
from app.schemas.user import UserCreate, UserProfileKPIs, ProfileBinderSummary
from app.core.security import hash_otp


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_phone(db: Session, phone_number: str) -> Optional[User]:
    return db.query(User).filter(User.phone_number == phone_number).first()


def get_user_by_unique_fields(
    db: Session, 
    username: str, 
    email: str, 
    phone_number: str
) -> Optional[User]:
    return db.query(User).filter(
        (User.username == username) |
        (User.email == email) |
        (User.phone_number == phone_number)
    ).first()


def create_user(db: Session, payload: UserCreate) -> User:
    nuevo_usuario = User(
        username=payload.username,
        email=payload.email,
        phone_number=payload.phone_number,
        location=payload.location or "Medellín / Bello, Antioquia",
        is_phone_verified=False,
        reputation_score=100,
        rating=5.0,
        completed_trades=0,
        disputes_count=0
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


def get_user_profile_aggregates(
    db: Session, 
    user_id: str, 
    is_owner: bool = False
) -> Tuple[UserProfileKPIs, List[ProfileBinderSummary]]:
    """
    Realiza una sola consulta SQL agrupada para obtener binders y conteo de cartas,
    evitando N+1 queries. Oculta binders privados si no es el dueño.
    """
    query = (
        db.query(
            Collection,
            func.coalesce(func.sum(UserCard.quantity), 0).label("total_cards"),
            func.coalesce(
                func.sum(
                    case((UserCard.is_for_trade.is_(True), UserCard.quantity), else_=0)
                ),
                0
            ).label("cards_for_trade")
        )
        .outerjoin(UserCard, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id)
    )

    if not is_owner:
        # Solo mostrar binders públicos a terceros
        query = query.filter(
            func.coalesce(getattr(Collection, 'is_public_trade', True), True).is_(True)
        )

    rows = query.group_by(Collection.id).all()

    binders: List[ProfileBinderSummary] = []
    total_cards_in_collection = 0
    cards_for_trade = 0

    default_art = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60"

    for col, total_c, trade_c in rows:
        total_c_int = int(total_c)
        trade_c_int = int(trade_c)
        total_cards_in_collection += total_c_int
        cards_for_trade += trade_c_int

        binders.append(
            ProfileBinderSummary(
                id=str(col.id),
                name=col.name,
                description=col.description,
                is_public_trade=getattr(col, 'is_public_trade', True),
                card_count=total_c_int,
                art_url=getattr(col, 'art_url', None) or default_art
            )
        )

    # Conteo de deseos (wishlist)
    wishlist_wants = db.query(func.count(WishlistItem.id)).filter(
        WishlistItem.user_id == user_id
    ).scalar() or 0

    kpis = UserProfileKPIs(
        active_binders=len(binders),
        max_binders=10,
        total_cards_in_collection=total_cards_in_collection,
        cards_for_trade=cards_for_trade,
        wishlist_wants=int(wishlist_wants)
    )

    return kpis, binders


def can_issue_otp(user: User) -> bool:
    """Verifica si no está en cooldown o bloqueado por superar intentos."""
    now = datetime.now(timezone.utc)
    if user.otp_expires_at and user.otp_expires_at > now:
        if getattr(user, 'otp_attempts', 0) >= 5:
            return False  # Bloqueado hasta que expire el código
    return True


def set_user_otp_code(db: Session, user: User, code: str) -> None:
    """
    Guarda el hash del OTP con expiración de 5 minutos.
    Solo reinicia intentos si el código anterior ya expiró.
    """
    now = datetime.now(timezone.utc)
    if not user.otp_expires_at or user.otp_expires_at <= now:
        user.otp_attempts = 0

    user.otp_hash = hash_otp(code, str(user.id))
    user.otp_expires_at = now + timedelta(minutes=5)
    db.commit()


def mark_phone_as_verified(db: Session, user: User) -> None:
    user.is_phone_verified = True
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    db.commit()