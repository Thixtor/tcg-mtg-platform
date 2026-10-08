# app/services/auth_service.py
# ============================================================================
# SERVICIO DE DOMINIO: SEGURIDAD, OTP POR CORREO Y CONTRASEÑAS (POO / DDD)
# ============================================================================
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import bcrypt

from app.models.user import User, _compute_otp_hash
from app.core.config import settings
from app.core.security import generate_secure_otp, create_access_token, hash_otp
from app.services.email_service import EmailService
from app.schemas.user import UserCreate, RequestCodePayload, VerifyCodePayload, PasswordLoginPayload

logger: logging.Logger = logging.getLogger("auth_service")


def hash_password(password: str) -> str:
    """Genera hash bcrypt truncando de forma segura al límite de 72 bytes."""
    pwd_bytes: bytes = password.encode('utf-8')[:72]
    salt: bytes = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña en texto plano contra el hash bcrypt."""
    try:
        pwd_bytes: bytes = plain_password.encode('utf-8')[:72]
        hash_bytes: bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


class AuthService:
    """
    Servicio encargado de orquestar autenticación dual (OTP por correo o Contraseña)
    y validación de identidades.
    """

    @classmethod
    def register_user(cls, db: Session, payload: UserCreate) -> Tuple[User, bool]:
        """
        Crea la entidad de usuario o reanuda el registro si la cuenta previa no estaba verificada.
        Retorna (user, is_resumed).
        """
        clean_username: str = payload.username.strip().lower()
        clean_email: str = payload.email.strip().lower()

        existing: Optional[User] = db.query(User).filter(
            (User.username == clean_username) | (User.email == clean_email)
        ).first()

        if existing:
            # Si el usuario ya está verificado, rechazar con conflicto
            if existing.is_email_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El nombre de usuario o correo ya se encuentra registrado y activo."
                )

            # Si NO está verificado, permitimos reanudar el registro y actualizar sus credenciales
            if payload.password:
                existing.password_hash = hash_password(payload.password)
            if payload.phone_number:
                existing.phone_number = payload.phone_number.strip()
            if payload.location:
                existing.location = payload.location

            existing.username = clean_username
            existing.email = clean_email
            db.commit()
            db.refresh(existing)
            return existing, True

        hashed_pwd: Optional[str] = hash_password(payload.password) if payload.password else None

        new_user: User = User(
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
        return new_user, False

    @classmethod
    def resend_verification_code(cls, db: Session, user_id: str) -> Tuple[str, str]:
        """
        Genera y reenvía un nuevo OTP de verificación si pasaron al menos 60 segundos.
        Retorna (otp_code, email).
        """
        user: Optional[User] = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado."
            )

        if user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta ya ha sido verificada previamente."
            )

        # Validar cooldown de 60 segundos contra el tiempo restante del OTP (vida total: 10 min)
        if user.otp_expires_at:
            now: datetime = datetime.now(timezone.utc)
            # Si expira en más de 9 minutos, significa que se envió hace menos de 1 minuto
            if user.otp_expires_at > (now + timedelta(minutes=9)):
                seconds_left: int = int((user.otp_expires_at - (now + timedelta(minutes=9))).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Por favor espera {max(seconds_left, 1)} segundos antes de solicitar un nuevo código."
                )

        otp_code: str = generate_secure_otp()
        otp_hash: str = _compute_otp_hash(code=otp_code, user_id=str(user.id))
        user.register_otp_challenge(otp_hash_digest=otp_hash, lifetime_minutes=10)
        db.commit()

        return otp_code, user.email

    @classmethod
    def request_otp(
        cls, 
        db: Session, 
        payload: RequestCodePayload
    ) -> Tuple[Dict[str, str], Optional[str]]:
        """Genera un OTP y lo despacha por correo mediante EmailService."""
        email: str = payload.email.strip().lower()
        user: Optional[User] = db.query(User).filter(User.email == email).with_for_update().first()

        dev_code: Optional[str] = None
        if user and user.can_request_otp():
            otp_code: str = generate_secure_otp()
            user.register_otp_challenge(
                otp_hash_digest=hash_otp(otp_code, str(user.id)),
                lifetime_minutes=10
            )
            db.commit()

            EmailService.send_verification_otp(
                to_email=user.email,
                username=user.username,
                otp_code=otp_code,
                is_update=False
            )

            if settings.EXPOSE_DEV_OTP and settings.ENVIRONMENT != "production":
                dev_code = otp_code

        response_data: Dict[str, str] = {
            "status": "success",
            "message": "Si el correo electrónico está registrado, recibirás un código de acceso."
        }
        return response_data, dev_code

    @classmethod
    def verify_otp_and_login(cls, db: Session, payload: VerifyCodePayload) -> Dict[str, Any]:
        """Valida el código OTP de acceso, activa el correo y genera el token Bearer JWT."""
        email: str = payload.email.strip().lower()
        user: Optional[User] = db.query(User).filter(User.email == email).with_for_update().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de verificación incorrecto, expirado o intentos máximos superados."
            )

        is_ok: bool = user.verify_otp(payload.code)
        db.commit()

        if not is_ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de verificación incorrecto, expirado o intentos máximos superados."
            )

        user.mark_email_as_verified()
        db.commit()
        db.refresh(user)

        access_token: str = create_access_token(user_id=str(user.id))

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    @classmethod
    def login_with_password(cls, db: Session, payload: PasswordLoginPayload) -> Dict[str, Any]:
        """Autentica por correo y contraseña verificando que la cuenta esté activada."""
        email: str = payload.email.strip().lower()
        user: Optional[User] = db.query(User).filter(User.email == email).first()

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

        if not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Debes verificar tu correo electrónico antes de iniciar sesión. Ingresa con OTP o verifica tu cuenta."
            )

        access_token: str = create_access_token(user_id=str(user.id))

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }