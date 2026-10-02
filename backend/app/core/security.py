# app/core/security.py
# ---------------------------------------------------------
# CORE DE SEGURIDAD: CRIPTOGRAFÍA, JWT Y CONTROL DE SESIÓN
# ---------------------------------------------------------
import secrets
import hmac
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger("security")
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------
# 1. LÓGICA DE OTP SEGURO
# ---------------------------------------------------------
def generate_secure_otp() -> str:
    """Genera un OTP numérico seguro de 6 dígitos mediante secrets."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str, user_id: str) -> str:
    """
    Genera un HMAC-SHA256 ligado al user_id para prevenir colisiones
    o ataques basados en tablas precalculadas (rainbow tables).
    """
    message = f"{user_id}:{code.strip()}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


# ---------------------------------------------------------
# 2. LÓGICA DE JWT Y AUTENTICACIÓN
# ---------------------------------------------------------
def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un token JWT firmado con expiración UTC y claims estándar."""
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


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodifica y valida rigurosamente la firma y claims obligatorios del token."""
    return jwt.decode(
        token, 
        settings.SECRET_KEY, 
        algorithms=[settings.ALGORITHM],
        options={"require": ["exp", "sub"]}
    )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependencia de FastAPI para autenticación Bearer JWT obligatoria."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación no proporcionadas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
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


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependencia unificada para endpoints con acceso público/privado opcional.
    Retorna None si no hay token o es inválido.
    """
    if not credentials:
        return None

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
    except jwt.PyJWTError:
        return None

    return db.query(User).filter(User.id == str(user_id)).first()