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

logger: logging.Logger = logging.getLogger("security")
bearer_scheme: HTTPBearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------
# 1. LÓGICA DE OTP SEGURO (VERIFICACIÓN POR CORREO)
# ---------------------------------------------------------
def generate_secure_otp() -> str:
    """Genera un OTP numérico seguro de 6 dígitos mediante secrets."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str, user_id: str) -> str:
    """
    Genera un HMAC-SHA256 ligado al user_id para prevenir colisiones
    o ataques basados en tablas precalculadas (rainbow tables).
    """
    message: bytes = f"{user_id}:{code.strip()}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_otp_hash(code: str, user_id: str, stored_hash: str) -> bool:
    """
    Valida un OTP de entrada contra el hash almacenado usando tiempo constante
    para evitar ataques de temporización (timing attacks).
    """
    if not code or not user_id or not stored_hash:
        return False
    computed_hash: str = hash_otp(code, user_id)
    return hmac.compare_digest(computed_hash, stored_hash)


# ---------------------------------------------------------
# 2. TOKENS TEMPORALES DE ACCIÓN POR CORREO
# ---------------------------------------------------------
def create_email_action_token(
    email: str,
    action_type: str = "verify_email",
    expires_hours: int = 24
) -> str:
    """
    Genera un token JWT temporal firmado para acciones enviadas por enlace
    (e.g., activación directa de cuenta o restablecimiento de contraseña).
    """
    now: datetime = datetime.now(timezone.utc)
    expire: datetime = now + timedelta(hours=expires_hours)
    payload: Dict[str, Any] = {
        "sub": email,
        "action": action_type,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_email_action_token(token: str, expected_action: str = "verify_email") -> Optional[str]:
    """
    Decodifica y valida un token de acción por email. Retorna el correo ('sub')
    únicamente si la firma, expiración y tipo de acción son válidos.
    """
    try:
        payload: Dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub"]}
        )
        if payload.get("action") != expected_action:
            return None
        return str(payload.get("sub"))
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------
# 3. LÓGICA DE JWT Y AUTENTICACIÓN DE SESIÓN
# ---------------------------------------------------------
def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un token JWT firmado con expiración UTC y claims estándar."""
    now: datetime = datetime.now(timezone.utc)
    if expires_delta:
        expire: datetime = now + expires_delta
    else:
        expire: datetime = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    payload: Dict[str, Any] = {
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
        payload: Dict[str, Any] = decode_access_token(credentials.credentials)
        user_id: Optional[str] = payload.get("sub")
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

    user: Optional[User] = db.query(User).filter(User.id == str(user_id)).first()
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
        payload: Dict[str, Any] = decode_access_token(credentials.credentials)
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            return None
    except jwt.PyJWTError:
        return None

    return db.query(User).filter(User.id == str(user_id)).first()