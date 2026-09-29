import secrets
import hmac
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger("security")
bearer_scheme = HTTPBearer(auto_error=False)


# --- 1. LÓGICA DE OTP SEGURO ---

def generate_secure_otp() -> str:
    """Genera un OTP numérico seguro de 6 dígitos."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str, user_id: str) -> str:
    """Genera un HMAC-SHA256 único ligado al user_id para prevenir colisiones o rainbow tables."""
    message = f"{user_id}:{code.strip()}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_otp_digest(user: User, code: str) -> bool:
    """
    Verifica el código contra el hash almacenado, validando expiración e intentos.
    Incrementa de forma atómica user.otp_attempts (debe llamarse con la fila bloqueada).
    """
    now = datetime.now(timezone.utc)
    user_expires = user.otp_expires_at

    # Normalizar timestamps naive provenientes de SQLAlchemy
    if user_expires and user_expires.tzinfo is None:
        user_expires = user_expires.replace(tzinfo=timezone.utc)

    # Si ya superó el umbral de intentos o expiró, rechazar
    if not user.otp_hash or not user_expires or user_expires < now or (user.otp_attempts or 0) >= 5:
        return False

    user.otp_attempts = (user.otp_attempts or 0) + 1

    expected_hash = hash_otp(code, str(user.id))
    return hmac.compare_digest(user.otp_hash, expected_hash)


# --- 2. LÓGICA DE JWT Y AUTENTICACIÓN ---

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un token JWT firmado con expiración UTC."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": now
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependencia de FastAPI para autenticación Bearer JWT.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación no proporcionadas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de sesión inválido.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado o inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user