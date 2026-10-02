# app/models/user.py
# ---------------------------------------------------------
# ENTIDAD: USUARIO Y AGREGADO RAÍZ DE IDENTIDAD (POO / DDD)
# ---------------------------------------------------------
import uuid
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime
from sqlalchemy.orm import relationship

from app.database import Base
from app.core.config import settings

OTP_MAX_ATTEMPTS = 5


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normaliza datetimes naive provenientes de BD a timezone aware UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _compute_otp_hash(code: str, user_id: str) -> str:
    """Calcula el HMAC-SHA256 del código OTP ligado al UUID del usuario."""
    message = f"{user_id}:{code.strip()}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


class User(Base):
    """
    Agregado Raíz del usuario.
    Controla el ciclo de vida de autenticación OTP, reputación P2P
    y la titularidad de colecciones, mazos y listas de deseos.
    """
    __tablename__ = 'users'

    # Identificación básica
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True, default="Coleccionista y jugador de MTG.")
    location = Column(String, nullable=True, default="Medellín / Bello, Antioquia")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Preferencias comerciales y P2P
    preferred_currency = Column(String, default="COP", nullable=False)
    allows_local_meetup = Column(Boolean, default=True, nullable=False)
    allows_nationwide_shipping = Column(Boolean, default=True, nullable=False)

    # Verificación de identidad y seguridad OTP
    phone_number = Column(String, unique=True, index=True, nullable=True)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    otp_hash = Column(String, nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_attempts = Column(Integer, default=0, nullable=False)

    # Reputación y métricas P2P
    reputation_score = Column(Integer, default=100, nullable=False)
    rating = Column(Float, default=5.0, nullable=False)
    completed_trades = Column(Integer, default=0, nullable=False)
    disputes_count = Column(Integer, default=0, nullable=False)

    # Relaciones del Agregado
    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")
    decks = relationship("Deck", back_populates="owner", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    wishlist = relationship("WishlistItem", overlaps="wishlist_items", viewonly=True)

    # -------------------------------------------------------------------------
    # Comportamiento de Seguridad y Autenticación OTP (Punto Único de Verdad)
    # -------------------------------------------------------------------------
    def can_request_otp(self) -> bool:
        """Determina si el usuario puede solicitar un nuevo desafío OTP."""
        if self.otp_expires_at is None:
            return True
        expires = _ensure_utc(self.otp_expires_at)
        now = datetime.now(timezone.utc)
        return now >= expires

    def register_otp_challenge(self, otp_hash_digest: str, lifetime_minutes: int = 5) -> None:
        """Inicializa un nuevo desafío de acceso seguro."""
        self.otp_hash = otp_hash_digest
        self.otp_attempts = 0
        self.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=lifetime_minutes)

    def verify_otp(self, code: str) -> bool:
        """
        Punto único de validación de código:
        Comprueba integridad, vigencia temporal y consumo atómico de intentos.
        """
        expires = _ensure_utc(self.otp_expires_at)
        now = datetime.now(timezone.utc)

        # 1. Comprobaciones de precondición y expiración
        if not self.otp_hash or expires is None or expires < now or self.otp_attempts >= OTP_MAX_ATTEMPTS:
            self.clear_otp_challenge()
            return False

        # 2. Registrar el intento actual (conteo unificado exacto)
        self.otp_attempts += 1

        # 3. Comparación en tiempo constante contra ataques de timing
        expected_hash = _compute_otp_hash(code, str(self.id))
        is_match = hmac.compare_digest(self.otp_hash, expected_hash)

        if is_match:
            self.clear_otp_challenge()
            return True

        # 4. Si falló y llegó al tope máximo, invalidar de inmediato
        if self.otp_attempts >= OTP_MAX_ATTEMPTS:
            self.clear_otp_challenge()

        return False

    def clear_otp_challenge(self) -> None:
        """Destruye el desafío activo para prevenir ataques de replay."""
        self.otp_hash = None
        self.otp_expires_at = None
        self.otp_attempts = 0

    def mark_phone_as_verified(self) -> None:
        self.is_phone_verified = True
        self.clear_otp_challenge()

    # -------------------------------------------------------------------------
    # Comportamiento de Perfil y P2P
    # -------------------------------------------------------------------------
    def update_profile(
        self,
        bio: Optional[str] = None,
        location: Optional[str] = None,
        avatar_url: Optional[str] = None,
        preferred_currency: Optional[str] = None,
        allows_local_meetup: Optional[bool] = None,
        allows_nationwide_shipping: Optional[bool] = None
    ) -> None:
        if bio is not None:
            self.bio = bio.strip() if bio else None
        if location is not None:
            self.location = location.strip() if location else None
        if avatar_url is not None:
            self.avatar_url = avatar_url.strip() if avatar_url else None
        if preferred_currency is not None:
            self.preferred_currency = preferred_currency.strip().upper()
        if allows_local_meetup is not None:
            self.allows_local_meetup = allows_local_meetup
        if allows_nationwide_shipping is not None:
            self.allows_nationwide_shipping = allows_nationwide_shipping

    def register_successful_trade(self) -> None:
        self.completed_trades += 1
        self.reputation_score = min(200, self.reputation_score + 2)

    def register_dispute(self) -> None:
        self.disputes_count += 1
        self.reputation_score = max(0, self.reputation_score - 15)