# app/models/trade_post.py
# ---------------------------------------------------------
# ENTIDADES DE DOMINIO: PUBLICACIONES SOCIALES DE TRADE
# ---------------------------------------------------------
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, 
    String, 
    Integer, 
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
    Publicación social en el Trade Wall.
    Estructura la oferta bidireccional: lo que el usuario BUSCA vs lo que OFRECE.
    """
    __tablename__ = 'trade_posts'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Estructura JSON con lista de cartas: [{name, id, condition, edition, is_foil, image_url, ...}]
    wanted_cards = Column(JSON, nullable=False, default=list)
    offered_cards = Column(JSON, nullable=False, default=list)

    notes = Column(Text, nullable=True)
    location = Column(String(100), default="Medellín, Antioquia", nullable=False)
    
    # Parámetros para transacciones mixtas (efectivo + cartas)
    accepts_cash = Column(Boolean, default=True, nullable=False)
    preferred_usd_rate = Column(Integer, default=3200, nullable=False)  # Tasa pactada local (COP)

    likes_count = Column(Integer, default=0, nullable=False)
    comments_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

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