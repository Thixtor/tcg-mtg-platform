from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from app.core.security import generate_secure_otp, hash_otp, verify_otp_digest


def test_generate_secure_otp_format():
    otp = generate_secure_otp()
    assert len(otp) == 6
    assert otp.isdigit()


def test_verify_otp_success():
    mock_user = MagicMock()
    mock_user.id = "user-123"
    code = "123456"
    mock_user.otp_hash = hash_otp(code, mock_user.id)
    mock_user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_user.otp_attempts = 0

    assert verify_otp_digest(mock_user, code) is True


def test_verify_otp_invalid_code():
    mock_user = MagicMock()
    mock_user.id = "user-123"
    mock_user.otp_hash = hash_otp("123456", mock_user.id)
    mock_user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_user.otp_attempts = 0

    assert verify_otp_digest(mock_user, "999999") is False
    assert mock_user.otp_attempts == 1


def test_verify_otp_expired():
    mock_user = MagicMock()
    mock_user.id = "user-123"
    code = "123456"
    mock_user.otp_hash = hash_otp(code, mock_user.id)
    # Expirado hace 1 minuto
    mock_user.otp_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    mock_user.otp_attempts = 0

    assert verify_otp_digest(mock_user, code) is False


def test_verify_otp_max_attempts_exceeded():
    mock_user = MagicMock()
    mock_user.id = "user-123"
    code = "123456"
    mock_user.otp_hash = hash_otp(code, mock_user.id)
    mock_user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_user.otp_attempts = 5  # Ya alcanzó los 5 intentos

    assert verify_otp_digest(mock_user, code) is False