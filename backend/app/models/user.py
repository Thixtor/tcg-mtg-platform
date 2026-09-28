# ---------------------------------------------------------
# ENTIDAD: USUARIO Y TRADER PROFILE (SQLAlchemy)
# ---------------------------------------------------------
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """
    Entidad de usuario y perfil de trader P2P con validación de identidad
    y métricas de reputación de mercado.
    """
    __tablename__ = 'users'

    # Identificación básica
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True, default="Coleccionista y jugador de MTG.")
    location = Column(String, nullable=True, default="Medellín / Bello, Antioquia")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Preferencias comerciales y P2P
    preferred_currency = Column(String, default="COP")  # "USD" o "COP"
    allows_local_meetup = Column(Boolean, default=True)
    allows_nationwide_shipping = Column(Boolean, default=True)

    # Verificación de identidad y seguridad
    phone_number = Column(String, unique=True, index=True, nullable=False)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    verification_code = Column(String, nullable=True)  # Código OTP temporal

    # Reputación y métricas P2P
    reputation_score = Column(Integer, default=100)
    rating = Column(Float, default=5.0)
    completed_trades = Column(Integer, default=0)
    disputes_count = Column(Integer, default=0)

    # Relaciones del usuario
    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")
    decks = relationship("Deck", back_populates="owner", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")