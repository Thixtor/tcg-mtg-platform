# app/services/auth_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: SEGURIDAD, OTP POR CORREO Y AUTENTICACIÓN
# ---------------------------------------------------------
import logging
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.core.config import settings
from app.core.security import generate_secure_otp, create_access_token, hash_otp
from app.core.otp_sender import get_otp_sender, OtpSender
from app.schemas.user import UserCreate, RequestCodePayload, VerifyCodePayload

logger = logging.getLogger("auth_service")


class AuthService:
    """
    Servicio de Dominio encargado de orquestar el flujo de autenticación,
    registro de identidades y validación criptográfica de OTP vía correo electrónico.
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

        new_user = User(
            username=clean_username,
            email=clean_email,
            phone_number=payload.phone_number.strip() if payload.phone_number else None,
            location=payload.location or "Medellín / Bello, Antioquia",
            is_phone_verified=False,
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
        payload: RequestCodePayload,
        sender: Optional[OtpSender] = None
    ) -> Tuple[Dict[str, str], Optional[str]]:
        email = payload.email.strip().lower()
        user = db.query(User).filter(User.email == email).with_for_update().first()

        dev_code: Optional[str] = None
        if user and user.can_request_otp():
            otp_code = generate_secure_otp()
            user.register_otp_challenge(
                otp_hash_digest=hash_otp(otp_code, str(user.id)),
                lifetime_minutes=5
            )
            db.commit()

            # Despacho a través de la interfaz OtpSender
            otp_dispatcher = sender or get_otp_sender()
            otp_dispatcher.send_otp(recipient=user.email, code=otp_code)

            if getattr(settings, "EXPOSE_DEV_OTP", False):
                dev_code = otp_code

        # Respuesta opaca idéntica contra ataques de enumeración y recolección de PII
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

        # Validación y conteo atómico encapsulado en el Agregado Raíz
        is_ok = user.verify_otp(payload.code)
        db.commit()

        if not is_ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de verificación incorrecto, expirado o intentos máximos superados."
            )

        db.refresh(user)
        access_token = create_access_token(user_id=str(user.id))

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }