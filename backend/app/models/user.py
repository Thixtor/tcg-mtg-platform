# app/models/user.py
# ============================================================================
# ENTIDAD: USUARIO Y AGREGADO RAÍZ DE IDENTIDAD (POO / DDD / MODERN SQLALCHEMY)
# ============================================================================
import uuid
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any
from sqlalchemy import String, Integer, Boolean, Float, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base
from app.core.config import settings

OTP_MAX_ATTEMPTS: int = 5


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normaliza datetimes naive provenientes de BD a timezone aware UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _compute_otp_hash(code: str, user_id: str) -> str:
    """Calcula el HMAC-SHA256 del código OTP ligado al UUID del usuario."""
    message: bytes = f"{user_id}:{code.strip()}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


class User(Base):
    """
    Agregado Raíz del usuario.
    Controla el ciclo de vida de autenticación (OTP / Contraseña), verificación de correo,
    reputación P2P y la titularidad de colecciones, mazos y listas de deseos.
    """
    __tablename__: str = 'users'

    # Identificación básica
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Verificación de Correo Electrónico
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pending_email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default="Coleccionista y jugador de MTG.")
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, default="Medellín / Bello, Antioquia")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Preferencias comerciales y P2P
    preferred_currency: Mapped[str] = mapped_column(String(10), default="COP", nullable=False)
    allows_local_meetup: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allows_nationwide_shipping: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Verificación de identidad y seguridad OTP
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), unique=True, index=True, nullable=True)
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    otp_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    otp_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Reputación y métricas P2P
    reputation_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    completed_trades: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    disputes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relaciones del Agregado
    collections: Mapped[List["Collection"]] = relationship(  # type: ignore # noqa: F821
        "Collection", back_populates="owner", cascade="all, delete-orphan"
    )
    decks: Mapped[List["Deck"]] = relationship(  # type: ignore # noqa: F821
        "Deck", back_populates="owner", cascade="all, delete-orphan"
    )
    wishlist_items: Mapped[List["WishlistItem"]] = relationship(  # type: ignore # noqa: F821
        "WishlistItem", back_populates="user", cascade="all, delete-orphan"
    )
    wishlist: Mapped[List["WishlistItem"]] = relationship(  # type: ignore # noqa: F821
        "WishlistItem", overlaps="wishlist_items", viewonly=True
    )

    # -------------------------------------------------------------------------
    # Comportamiento de Seguridad y Autenticación OTP
    # -------------------------------------------------------------------------
    def can_request_otp(self) -> bool:
        """Determina si el usuario puede solicitar un nuevo desafío OTP."""
        if self.otp_expires_at is None:
            return True
        expires: Optional[datetime] = _ensure_utc(self.otp_expires_at)
        now: datetime = datetime.now(timezone.utc)
        return expires is not None and now >= expires

    def register_otp_challenge(self, otp_hash_digest: str, lifetime_minutes: int = 10) -> None:
        """Inicializa un nuevo desafío de acceso seguro o verificación."""
        self.otp_hash = otp_hash_digest
        self.otp_attempts = 0
        self.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=lifetime_minutes)

    def verify_otp(self, code: str) -> bool:
        """
        Punto único de validación de código:
        Comprueba integridad, vigencia temporal y consumo atómico de intentos.
        """
        expires: Optional[datetime] = _ensure_utc(self.otp_expires_at)
        now: datetime = datetime.now(timezone.utc)

        # 1. Comprobaciones de precondición y expiración
        if not self.otp_hash or expires is None or expires < now or self.otp_attempts >= OTP_MAX_ATTEMPTS:
            self.clear_otp_challenge()
            return False

        # 2. Registrar intento
        self.otp_attempts += 1

        # 3. Comparación constante de hash
        expected_hash: str = _compute_otp_hash(code, str(self.id))
        is_match: bool = hmac.compare_digest(self.otp_hash, expected_hash)

        if is_match:
            self.clear_otp_challenge()
            return True

        if self.otp_attempts >= OTP_MAX_ATTEMPTS:
            self.clear_otp_challenge()

        return False

    def clear_otp_challenge(self) -> None:
        """Destruye el desafío activo para prevenir ataques de replay."""
        self.otp_hash = None
        self.otp_expires_at = None
        self.otp_attempts = 0

    def mark_email_as_verified(self) -> None:
        """Confirma el correo actual o aplica el pendiente de forma atómica."""
        if self.pending_email:
            self.email = self.pending_email
            self.pending_email = None
        self.is_email_verified = True
        self.clear_otp_challenge()

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
        self.reputation_score = min(200, (self.reputation_score or 100) + 2)

    def register_dispute(self) -> None:
        self.disputes_count += 1
        self.reputation_score = max(0, (self.reputation_score or 100) - 15)

    def apply_feedback(self, rating_value: float, successful: bool) -> None:
        current_rating: float = self.rating if self.rating is not None else 5.0
        trades: int = max(self.completed_trades or 1, 1)

        self.rating = round(((current_rating * (trades - 1)) + rating_value) / trades, 2)

        if successful:
            bonus: int = int(rating_value * 2)
            self.reputation_score = min(200, (self.reputation_score or 100) + bonus)
        else:
            self.register_dispute()