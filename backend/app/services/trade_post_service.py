# app/services/trade_post_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: PUBLICACIONES Y CONVERSIÓN P2P
# ---------------------------------------------------------
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.trade_post import TradePost, TradePostLike
from app.models.user import User
from app.schemas.trade_post import (
    TradePostCreatePayload, 
    CashDifferenceCalculationRequest,
    CashDifferenceCalculationResponse
)


class TradePostService:
    """Orquestador de publicaciones sociales y cálculos de compensación."""

    @staticmethod
    def calculate_cash_difference(req: CashDifferenceCalculationRequest) -> CashDifferenceCalculationResponse:
        """
        Calcula la brecha de valor en USD y la convierte a moneda local (COP)
        usando la tasa de mercado acordada por la comunidad.
        """
        diff = round(req.offered_usd_total - req.requested_usd_total, 2)

        if abs(diff) < 0.05:
            return CashDifferenceCalculationResponse(
                difference_usd=0.0,
                cash_amount_cop=0,
                payer="even",
                explanation="El intercambio tiene paridad económica equitativa."
            )

        if diff > 0:
            # Lo que ofreces vale más: la contraparte te compensa en efectivo
            cop = int(round(diff * req.usd_to_cop_rate, -2))  # redondeado a centenas
            return CashDifferenceCalculationResponse(
                difference_usd=diff,
                cash_amount_cop=cop,
                payer="receiver",
                explanation=f"Tus cartas superan el valor por ${diff:.2f} USD. La contraparte aporta ${cop:,} COP."
            )
        else:
            # Lo que pides vale más: tú aportas el excedente en efectivo
            needed = abs(diff)
            cop = int(round(needed * req.usd_to_cop_rate, -2))
            return CashDifferenceCalculationResponse(
                difference_usd=needed,
                cash_amount_cop=cop,
                payer="proposer",
                explanation=f"Las cartas solicitadas superan tu oferta por ${needed:.2f} USD. Aportas ${cop:,} COP."
            )

    @classmethod
    def create_post(cls, db: Session, user: User, payload: TradePostCreatePayload) -> TradePost:
        post = TradePost(
            author_id=str(user.id),
            wanted_cards=[c.model_dump() for c in payload.wanted_cards],
            offered_cards=[c.model_dump() for c in payload.offered_cards],
            notes=payload.notes,
            location=payload.location or getattr(user, "location", "Medellín, Antioquia"),
            accepts_cash=payload.accepts_cash,
            preferred_usd_rate=payload.preferred_usd_rate
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        return post

    @classmethod
    def get_posts(
        cls, 
        db: Session, 
        current_user_id: Optional[str] = None,
        scope: str = "for-you",
        location: Optional[str] = None,
        limit: int = 30,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        query = db.query(TradePost).filter(TradePost.is_active.is_(True))

        if scope == "my-posts" and current_user_id:
            query = query.filter(TradePost.author_id == current_user_id)
        elif location:
            query = query.filter(TradePost.location.ilike(f"%{location.strip()}%"))

        posts = query.order_by(desc(TradePost.created_at)).offset(skip).limit(limit).all()

        # Determinar si el usuario dio like
        user_likes = set()
        if current_user_id:
            likes = db.query(TradePostLike.post_id).filter(
                TradePostLike.user_id == current_user_id,
                TradePostLike.post_id.in_([p.id for p in posts])
            ).all()
            user_likes = {l[0] for l in likes}

        results = []
        for p in posts:
            author_data = {
                "id": str(p.author.id),
                "username": p.author.username,
                "reputation_score": getattr(p.author, "reputation_score", 0) or 100,
                "is_verified": getattr(p.author, "is_verified", True),
            }
            results.append({
                "id": str(p.id),
                "author": author_data,
                "wanted_cards": p.wanted_cards,
                "offered_cards": p.offered_cards,
                "notes": p.notes,
                "location": p.location,
                "accepts_cash": p.accepts_cash,
                "preferred_usd_rate": p.preferred_usd_rate,
                "likes_count": p.likes_count,
                "comments_count": p.comments_count,
                "has_liked": p.id in user_likes,
                "created_at": p.created_at
            })

        return results

    @classmethod
    def toggle_like(cls, db: Session, post_id: str, user_id: str) -> Dict[str, Any]:
        post = db.query(TradePost).filter(TradePost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicación no encontrada.")

        existing = db.query(TradePostLike).filter(
            TradePostLike.post_id == post_id,
            TradePostLike.user_id == user_id
        ).first()

        if existing:
            db.delete(existing)
            post.likes_count = max(0, post.likes_count - 1)
            has_liked = False
        else:
            new_like = TradePostLike(post_id=post_id, user_id=user_id)
            db.add(new_like)
            post.likes_count += 1
            has_liked = True

        db.commit()
        return {"likes_count": post.likes_count, "has_liked": has_liked}