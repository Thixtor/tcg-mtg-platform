# app/services/auth_service.py
# ============================================================================
# SERVICIO DE DOMINIO: SEGURIDAD, OTP POR CORREO Y CONTRASEÑAS (POO / DDD)
# ============================================================================
import logging
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import bcrypt

from app.models.user import User
from app.core.config import settings
from app.core.security import generate_secure_otp, create_access_token, hash_otp
from app.services.email_service import EmailService
from app.schemas.user import UserCreate, RequestCodePayload, VerifyCodePayload, PasswordLoginPayload

logger = logging.getLogger("auth_service")


def hash_password(password: str) -> str:
    """Genera hash bcrypt truncando de forma segura al límite de 72 bytes."""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña en texto plano contra el hash bcrypt."""
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


class AuthService:
    """
    Servicio encargado de orquestar autenticación dual (OTP por correo o Contraseña)
    y validación de identidades.
    """

    @classmethod
    def register_user(cls, db: Session, payload: UserCreate) -> User:
        clean_username = payload.username.strip().lower()
        clean_email = payload.email.strip().lower()

        existing = db.query(User).filter(
            (User.username == clean_username) | (User.email == clean_email)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario o correo ya se encuentra registrado."
            )

        hashed_pwd = hash_password(payload.password) if payload.password else None

        new_user = User(
            username=clean_username,
            email=clean_email,
            password_hash=hashed_pwd,
            phone_number=payload.phone_number.strip() if payload.phone_number else None,
            location=payload.location or "Medellín / Bello, Antioquia",
            is_phone_verified=False,
            is_email_verified=False,
            reputation_score=100,
            rating=5.0,
            completed_trades=0,
            disputes_count=0
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @classmethod
    def request_otp(
        cls, 
        db: Session, 
        payload: RequestCodePayload
    ) -> Tuple[Dict[str, str], Optional[str]]:
        email = payload.email.strip().lower()
        user = db.query(User).filter(User.email == email).with_for_update().first()

        dev_code: Optional[str] = None
        if user and user.can_request_otp():
            otp_code = generate_secure_otp()
            user.register_otp_challenge(
                otp_hash_digest=hash_otp(otp_code, str(user.id)),
                lifetime_minutes=10
            )
            db.commit()

            # Despachar correo electrónico usando EmailService
            EmailService.send_verification_otp(
                to_email=user.email,
                username=user.username,
                otp_code=otp_code,
                is_update=False
            )

            dev_code = otp_code

        response_data = {
            "status": "success",
            "message": "Si el correo electrónico está registrado, recibirás un código de acceso."
        }
        return response_data, dev_code

    @classmethod
    def verify_otp_and_login(cls, db: Session, payload: VerifyCodePayload) -> Dict[str, Any]:
        email = payload.email.strip().lower()
        user = db.query(User).filter(User.email == email).with_for_update().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de verificación incorrecto, expirado o intentos máximos superados."
            )

        is_ok = user.verify_otp(payload.code)
        db.commit()

        if not is_ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de verificación incorrecto, expirado o intentos máximos superados."
            )

        # Si entra con código al correo, se valida automáticamente
        user.is_email_verified = True
        db.commit()
        db.refresh(user)

        access_token = create_access_token(user_id=str(user.id))

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    @classmethod
    def login_with_password(cls, db: Session, payload: PasswordLoginPayload) -> Dict[str, Any]:
        email = payload.email.strip().lower()
        user = db.query(User).filter(User.email == email).first()

        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas o la cuenta no tiene contraseña configurada."
            )

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas."
            )

        access_token = create_access_token(user_id=str(user.id))

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }