# app/services/user_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: USUARIOS, PERFILES Y AGREGACIONES P2P
# ---------------------------------------------------------
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from fastapi import HTTPException, status

from app.models.user import User
from app.models.collection import Collection
from app.models.collection import UserCard
from app.models.wishlist import WishlistItem
from app.schemas.user import (
    UserProfileKPIs,
    ProfileBinderSummary,
    UserProfileUpdate,
    UserPrivateProfileResponse,
    UserPublicProfileResponse,
)


class UserService:
    """
    Servicio de Dominio encargado del ciclo de vida del perfil de usuario,
    cálculo de KPIs de inventario y prevención de fugas de PII.
    """

    DEFAULT_BINDER_ART: str = (
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60"
    )

    @classmethod
    def get_user_by_id_or_fail(cls, db: Session, user_id: str) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con id {user_id} no encontrado."
            )
        return user

    @classmethod
    def list_public_users(cls, db: Session, limit: int = 20, offset: int = 0) -> List[User]:
        return (
            db.query(User)
            .order_by(User.username.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @classmethod
    def get_profile_aggregates(
        cls,
        db: Session,
        user_id: str,
        is_owner: bool = False
    ) -> Tuple[UserProfileKPIs, List[ProfileBinderSummary]]:
        """
        Ejecuta una única consulta SQL agregada agrupando por binder
        para evitar problemas de N+1 queries. Oculta binders privados si no es el dueño.
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
            query = query.filter(
                func.coalesce(getattr(Collection, 'is_public_trade', True), True).is_(True)
            )

        rows = query.group_by(Collection.id).all()

        binders: List[ProfileBinderSummary] = []
        total_cards_in_collection: int = 0
        cards_for_trade: int = 0

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
                    art_url=getattr(col, 'art_url', None) or cls.DEFAULT_BINDER_ART
                )
            )

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

    @classmethod
    def build_profile_payload(cls, db: Session, user: User, is_owner: bool) -> Dict[str, Any]:
        kpis, binders = cls.get_profile_aggregates(db, str(user.id), is_owner=is_owner)

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
            "reputation_score": user.reputation_score if user.reputation_score is not None else 100,
            "rating": user.rating if user.rating is not None else 5.0,
            "completed_trades": user.completed_trades if user.completed_trades is not None else 0,
            "disputes_count": user.disputes_count if user.disputes_count is not None else 0,
            "kpis": kpis,
            "binders": binders,
        }

    @classmethod
    def get_private_profile(cls, db: Session, user: User) -> UserPrivateProfileResponse:
        data = cls.build_profile_payload(db, user, is_owner=True)
        data["email"] = user.email
        data["phone_number"] = user.phone_number
        data["is_phone_verified"] = user.is_phone_verified
        return UserPrivateProfileResponse(**data)

    @classmethod
    def get_public_profile(cls, db: Session, target_user_id: str, requester_id: str) -> UserPublicProfileResponse:
        user = cls.get_user_by_id_or_fail(db, target_user_id)
        is_owner = str(requester_id) == str(user.id)
        data = cls.build_profile_payload(db, user, is_owner=is_owner)
        return UserPublicProfileResponse(**data)

    @classmethod
    def update_profile(cls, db: Session, user: User, profile_in: UserProfileUpdate) -> UserPrivateProfileResponse:
        update_data = profile_in.model_dump(exclude_unset=True)

        if "avatar_url" in update_data and update_data["avatar_url"] is not None:
            update_data["avatar_url"] = str(update_data["avatar_url"])

        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        db.commit()
        db.refresh(user)

        return cls.get_private_profile(db, user)