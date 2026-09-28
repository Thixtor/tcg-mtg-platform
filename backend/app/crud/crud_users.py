from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_otp


# ---------------------------------------------------------
# OPERACIONES DE BASE DE DATOS: USUARIOS Y AUTENTICACIÓN
# ---------------------------------------------------------
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
        reputation_score=100
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


def set_user_otp_code(db: Session, user: User, code: str) -> None:
    """
    Guarda el hash del OTP con expiración de 5 minutos y reinicia los intentos.
    """
    user.otp_hash = hash_otp(code, user.id)
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    user.otp_attempts = 0
    db.commit()


def mark_phone_as_verified(db: Session, user: User) -> None:
    user.is_phone_verified = True
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    db.commit()