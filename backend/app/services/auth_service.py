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

from app.models.user import User
from app.core.config import settings
from app.core.security import generate_secure_otp, create_access_token, hash_otp
from app.services.email_service import EmailService
from app.schemas.user import UserCreate, RequestCodePayload, VerifyCodePayload, PasswordLoginPayload

logger: logging.Logger = logging.getLogger("auth_service")


# ----------------------------------------------------------------------------
# FUNCIONES AUXILIARES DE HASHING
# ----------------------------------------------------------------------------
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


# ----------------------------------------------------------------------------
# CLASE SERVICIO DE AUTENTICACIÓN
# ----------------------------------------------------------------------------
class AuthService:
    """
    Servicio encargado de orquestar autenticación dual (OTP por correo o Contraseña)
    y validación de identidades.
    """

    @classmethod
    def register_user(cls, db: Session, payload: UserCreate) -> Tuple[User, bool, Optional[str]]:
        """
        Crea la entidad de usuario o reanuda el registro si la cuenta previa no estaba verificada.
        Garantiza que no existan colisiones cruzadas entre username y email de usuarios verificados.
        Retorna (user, is_resumed, dev_otp_code).
        """
        clean_username: str = payload.username.strip().lower()
        clean_email: str = payload.email.strip().lower()

        # 1. Comprobar colisiones independientes
        user_by_email: Optional[User] = db.query(User).filter(User.email == clean_email).first()
        user_by_username: Optional[User] = db.query(User).filter(User.username == clean_username).first()

        # Si el correo ya pertenece a una cuenta activa y verificada
        if user_by_email and user_by_email.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo electrónico ya se encuentra registrado y activo."
            )

        # Si el username ya pertenece a otra cuenta verificada
        if user_by_username and user_by_username.is_email_verified and user_by_username.id != getattr(user_by_email, "id", None):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya está tomado por una cuenta activa."
            )

        # 2. Caso: Reanudar registro existente pendiente de verificación
        target_user: Optional[User] = user_by_email or user_by_username
        is_resumed: bool = False

        if target_user and not target_user.is_email_verified:
            # Validar que al reanudar no choque con otro registro no verificado
            if user_by_email and user_by_username and user_by_email.id != user_by_username.id:
                # Conflicto entre dos registros huérfanos distintos: eliminamos el huérfano secundario o lo advertimos
                db.delete(user_by_username)
                db.flush()

            if payload.password:
                target_user.password_hash = hash_password(payload.password)
            if payload.phone_number:
                target_user.phone_number = payload.phone_number.strip()
            if payload.location:
                target_user.location = payload.location

            target_user.username = clean_username
            target_user.email = clean_email
            is_resumed = True
            user = target_user
        else:
            # 3. Caso: Usuario nuevo
            hashed_pwd: Optional[str] = hash_password(payload.password) if payload.password else None
            user = User(
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
            db.add(user)
            db.flush()

        # 4. Generar y despachar OTP de bienvenida/verificación inmediatamente
        otp_code: str = generate_secure_otp()
        otp_hash: str = hash_otp(code=otp_code, user_id=str(user.id))
        user.register_otp_challenge(otp_hash_digest=otp_hash, lifetime_minutes=10)

        db.commit()
        db.refresh(user)

        # Despacho asíncrono o seguro del correo
        EmailService.send_verification_otp(
            to_email=user.email,
            username=user.username,
            otp_code=otp_code,
            is_update=is_resumed
        )

        dev_otp_code: Optional[str] = None
        if settings.EXPOSE_DEV_OTP and settings.ENVIRONMENT != "production":
            dev_otp_code = otp_code

        return user, is_resumed, dev_otp_code

    @classmethod
    def resend_verification_code(cls, db: Session, user_id: str) -> Tuple[str, str, Optional[str]]:
        """
        Genera y reenvía un nuevo OTP de verificación respetando el cooldown de 60 segundos.
        Despacha el correo mediante EmailService.
        Retorna (status_message, email, dev_otp_code).
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
        now: datetime = datetime.now(timezone.utc)
        if user.otp_expires_at:
            if user.otp_expires_at > (now + timedelta(minutes=9)):
                seconds_left: int = int((user.otp_expires_at - (now + timedelta(minutes=9))).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Por favor espera {max(seconds_left, 1)} segundos antes de solicitar un nuevo código."
                )

        otp_code: str = generate_secure_otp()
        otp_hash: str = hash_otp(code=otp_code, user_id=str(user.id))
        user.register_otp_challenge(otp_hash_digest=otp_hash, lifetime_minutes=10)
        db.commit()

        # Enviar correo de reintento
        EmailService.send_verification_otp(
            to_email=user.email,
            username=user.username,
            otp_code=otp_code,
            is_update=True
        )

        dev_otp_code: Optional[str] = None
        if settings.EXPOSE_DEV_OTP and settings.ENVIRONMENT != "production":
            dev_otp_code = otp_code

        return "Código reenviado exitosamente.", user.email, dev_otp_code

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