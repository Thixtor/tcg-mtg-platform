# app/services/trade_post_service.py
# ============================================================================
# SERVICIO DE DOMINIO: PUBLICACIONES, MÉTRICAS Y CONVERSIÓN P2P
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Calcula automáticamente snapshots métricos al crear la publicación.
# - Implementa cierre y borrado lógico (Soft Delete) para preservar auditoría.
# - Filtra publicaciones activas para el mercado público manteniendo el historial
#   completo en las cuentas de usuario.
# ============================================================================

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from decimal import Decimal
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
    """Orquestador de publicaciones sociales, métricas y cálculos de compensación."""

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
            cop = int(round(diff * req.usd_to_cop_rate, -2))
            return CashDifferenceCalculationResponse(
                difference_usd=diff,
                cash_amount_cop=cop,
                payer="receiver",
                explanation=f"Tus cartas superan el valor por ${diff:.2f} USD. La contraparte aporta ${cop:,} COP."
            )
        else:
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
        """Crea una publicación computando métricas financieras persistentes."""
        offered_dump = [c.model_dump() for c in payload.offered_cards]
        wanted_dump = [c.model_dump() for c in payload.wanted_cards]

        # 1. Calcular totales monetarios en USD
        total_offered = sum(
            float(c.get("price_usd") or c.get("market_price_usd") or 0.0) * int(c.get("quantity") or 1)
            for c in offered_dump
        )
        total_requested = sum(
            float(c.get("price_usd") or c.get("market_price_usd") or 0.0) * int(c.get("quantity") or 1)
            for c in wanted_dump
        )

        # 2. Determinar intención comercial
        if len(wanted_dump) == 0 and payload.accepts_cash:
            trade_intent = "cash_only"
        elif len(offered_dump) == 0:
            trade_intent = "cash_only"
        elif not payload.accepts_cash:
            trade_intent = "trade_only"
        else:
            trade_intent = "both"

        post = TradePost(
            author_id=str(user.id),
            wanted_cards=wanted_dump,
            offered_cards=offered_dump,
            notes=payload.notes,
            location=payload.location or getattr(user, "location", "Medellín, Antioquia"),
            accepts_cash=payload.accepts_cash,
            preferred_usd_rate=payload.preferred_usd_rate,
            trade_intent=trade_intent,
            total_offered_usd=Decimal(f"{total_offered:.2f}"),
            total_requested_usd=Decimal(f"{total_requested:.2f}"),
            cash_amount_cop=Decimal(str(getattr(payload, "cash_amount", 0.0) or 0.0)),
            status="ACTIVE",
            is_active=True
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
        include_inactive: bool = False,
        limit: int = 30,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        query = db.query(TradePost)

        # El feed público siempre muestra publicaciones activas
        if scope != "my-posts" and not include_inactive:
            query = query.filter(TradePost.status == "ACTIVE", TradePost.is_active.is_(True))

        if scope == "my-posts" and current_user_id:
            # En "Mis Ofertas" mostramos las del usuario autenticado (activas y archivadas)
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
                "trade_intent": p.trade_intent,
                "total_offered_usd": float(p.total_offered_usd or 0.0),
                "total_requested_usd": float(p.total_requested_usd or 0.0),
                "status": p.status,
                "likes_count": p.likes_count,
                "comments_count": p.comments_count,
                "has_liked": p.id in user_likes,
                "created_at": p.created_at,
                "closed_at": p.closed_at
            })

        return results

    @classmethod
    def close_or_cancel_post(cls, db: Session, post_id: str, user_id: str) -> Dict[str, Any]:
        """Aplica borrado lógico (Soft Delete) cambiando el status a CANCELLED."""
        post = db.query(TradePost).filter(TradePost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicación no encontrada.")

        if str(post.author_id) != str(user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para cerrar este post.")

        post.status = "CANCELLED"
        post.is_active = False
        post.closed_at = datetime.now(timezone.utc)
        db.commit()
        return {"id": post.id, "status": post.status, "message": "Publicación retirada del Black Market con éxito."}

    @classmethod
    def complete_post(cls, db: Session, post_id: str, user_id: str) -> Dict[str, Any]:
        """Marca una publicación como completada / vendida preservando la auditoría."""
        post = db.query(TradePost).filter(TradePost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicación no encontrada.")

        if str(post.author_id) != str(user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para completar este post.")

        post.status = "COMPLETED"
        post.is_active = False
        post.closed_at = datetime.now(timezone.utc)
        db.commit()
        return {"id": post.id, "status": post.status, "message": "Intercambio completado y registrado en el historial."}

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