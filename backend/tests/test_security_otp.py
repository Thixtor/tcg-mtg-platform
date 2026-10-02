# tests/test_security_otp.py
# ---------------------------------------------------------
# SUITE DE PRUEBAS: GENERACIÓN Y VALIDACIÓN DE OTP (DDD / POO)
# ---------------------------------------------------------
"""
Módulo de pruebas unitarias para el ciclo de vida de OTP.
Valida la generación segura de códigos, expiración temporal UTC,
control unificado de reintentos e invalidación de desafíos en el modelo User.
"""

from datetime import datetime, timedelta, timezone

from app.core.security import generate_secure_otp, hash_otp
from app.models.user import User


# ---------------------------------------------------------
# 1. PRUEBAS DE GENERACIÓN DE CÓDIGO
# ---------------------------------------------------------

def test_generate_secure_otp_format() -> None:
    """Verifica que el OTP generado sea exactamente numérico de 6 dígitos."""
    otp = generate_secure_otp()
    assert len(otp) == 6
    assert otp.isdigit()


# ---------------------------------------------------------
# 2. PRUEBAS DE VALIDACIÓN DE DOMINIO (USER AGGREGATE)
# ---------------------------------------------------------

def test_verify_otp_success() -> None:
    """
    Verifica que un código correcto dentro de la ventana de tiempo
    sea aceptado y limpie inmediatamente el desafío activo.
    """
    # Arrange
    user = User(
        id="user-123",
        username="testuser",
        email="test@example.com",
        otp_attempts=0
    )
    code = "123456"
    user.otp_hash = hash_otp(code, str(user.id))
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Act
    is_valid = user.verify_otp(code)

    # Assert
    assert is_valid is True
    assert user.otp_hash is None
    assert user.otp_expires_at is None
    assert user.otp_attempts == 0


def test_verify_otp_invalid_code() -> None:
    """
    Verifica que un código erróneo sea rechazado e incremente
    el contador unificado de intentos fallidos.
    """
    # Arrange
    user = User(
        id="user-123",
        username="testuser",
        email="test@example.com",
        otp_attempts=0
    )
    user.otp_hash = hash_otp("123456", str(user.id))
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Act
    is_valid = user.verify_otp("999999")

    # Assert
    assert is_valid is False
    assert user.otp_attempts == 1
    assert user.otp_hash is not None


def test_verify_otp_expired() -> None:
    """
    Verifica que un código presentado posterior a su fecha de expiración
    sea rechazado y limpie el desafío vencido.
    """
    # Arrange
    user = User(
        id="user-123",
        username="testuser",
        email="test@example.com",
        otp_attempts=0
    )
    code = "123456"
    user.otp_hash = hash_otp(code, str(user.id))
    user.otp_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)

    # Act
    is_valid = user.verify_otp(code)

    # Assert
    assert is_valid is False
    assert user.otp_hash is None


def test_verify_otp_max_attempts_exceeded() -> None:
    """
    Verifica que si el usuario alcanza el límite de 5 intentos fallidos,
    el sistema invalide y destruya el desafío de acceso.
    """
    # Arrange: Usuario con 4 intentos previos fallidos
    user = User(
        id="user-123",
        username="testuser",
        email="test@example.com",
        otp_attempts=4
    )
    user.otp_hash = hash_otp("123456", str(user.id))
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Act: Quinto intento con código erróneo
    is_valid = user.verify_otp("000000")

    # Assert
    assert is_valid is False
    assert user.otp_hash is None
    assert user.otp_expires_at is None
    assert user.otp_attempts == 0