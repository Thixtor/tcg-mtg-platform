# app/models/trade_post.py
# ============================================================================
# ENTIDADES DE DOMINIO: PUBLICACIONES Y AUDITORÍA HISTÓRICA (BLACK MARKET)
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Soporta borrado lógico (Soft Delete) mediante 'status' ('ACTIVE', 'COMPLETED', 'CANCELLED').
# - Persiste snapshots financieros (total_offered_usd, total_requested_usd, cash_amount_cop)
#   para agregaciones directas y analítica sin procesar JSONs pesados en runtime.
# ============================================================================

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, 
    String, 
    Integer, 
    Numeric,
    DateTime, 
    ForeignKey, 
    Text, 
    JSON,
    Boolean,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base


class TradePost(Base):
    """
    Publicación en el Black Market / Trade Wall.
    Estructura la oferta bidireccional (OFREZCO vs BUSCO), snapshots métricos
    y ciclo de vida para auditoría de transacciones.
    """
    __tablename__ = 'trade_posts'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Estructura JSON con lista de cartas detalladas (incluyendo metadatos de juego)
    wanted_cards = Column(JSON, nullable=False, default=list)
    offered_cards = Column(JSON, nullable=False, default=list)

    notes = Column(Text, nullable=True)
    location = Column(String(100), default="Medellín, Antioquia", nullable=False)
    
    # Parámetros para transacciones mixtas (efectivo + cartas)
    accepts_cash = Column(Boolean, default=True, nullable=False)
    preferred_usd_rate = Column(Integer, default=3200, nullable=False)  # Tasa pactada local (COP)
    
    # -------------------------------------------------------------------------
    # SNAPSHOTS FINANCIEROS Y ANALÍTICA (MÉTRICAS A FUTURO)
    # -------------------------------------------------------------------------
    trade_intent = Column(String(20), default="both", nullable=False)  # 'cash_only', 'trade_only', 'both'
    total_offered_usd = Column(Numeric(10, 2), default=0.00, nullable=False)
    total_requested_usd = Column(Numeric(10, 2), default=0.00, nullable=False)
    cash_amount_cop = Column(Numeric(12, 2), default=0.00, nullable=False)

    # -------------------------------------------------------------------------
    # CICLO DE VIDA Y BORRADO LÓGICO (HISTORIAL PERSISTENTE)
    # -------------------------------------------------------------------------
    status = Column(String(20), default="ACTIVE", nullable=False, index=True)  # 'ACTIVE', 'COMPLETED', 'CANCELLED'
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    likes_count = Column(Integer, default=0, nullable=False)
    comments_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )
    closed_at = Column(DateTime(timezone=True), nullable=True)

    author = relationship("User", lazy="joined")
    likes = relationship("TradePostLike", back_populates="post", cascade="all, delete-orphan", lazy="select")


class TradePostLike(Base):
    """Registro de reacciones/favoritos en una publicación."""
    __tablename__ = 'trade_post_likes'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey('trade_posts.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    post = relationship("TradePost", back_populates="likes")

    __table_args__ = (
        UniqueConstraint('post_id', 'user_id', name='uq_trade_post_like_user'),
    )