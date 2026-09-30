# app/core/deps.py
"""
Módulo de compatibilidad hacia atrás para dependencias del núcleo.
La implementación canónica de autenticación reside en app.core.security.
"""
from app.core.security import (
    decode_access_token,
    get_current_user,
    get_current_user_optional
)

__all__ = [
    "decode_access_token",
    "get_current_user",
    "get_current_user_optional"
]