# app/services/email_service.py
# ============================================================================
# SERVICIO DE CORREO ELECTRÓNICO (GMAIL SMTP SSL/TLS DUAL - ALPHA TESTING)
# ============================================================================
# ARQUITECTURA:
# - Prioriza conexión segura directa SSL (puerto 465) para evitar el bloqueo
#   de sockets STARTTLS (puerto 587) en contenedores cloud.
# - Respaldo en logs de Docker/Railway si ocurre un corte de red saliente.
# - Tipado estricto con anotaciones de tipo.
# ============================================================================

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional, List, Any
import logging

from app.core.config import settings

logger: logging.Logger = logging.getLogger("app.email_service")


class EmailService:
    """Gestor de notificaciones y verificación por correo mediante Gmail SMTP."""

    @classmethod
    def _get_smtp_host(cls) -> str:
        val: Optional[str] = getattr(settings, "SMTP_HOST", None) or os.getenv("SMTP_HOST", "smtp.gmail.com")
        return str(val).strip() if val else "smtp.gmail.com"

    @classmethod
    def _get_smtp_port(cls) -> int:
        port_val: Any = getattr(settings, "SMTP_PORT", None) or os.getenv("SMTP_PORT", "465")
        try:
            return int(port_val)
        except (ValueError, TypeError):
            return 465

    @classmethod
    def _get_smtp_user(cls) -> str:
        val: Optional[str] = getattr(settings, "SMTP_USER", None) or os.getenv("SMTP_USER", "")
        return str(val).strip() if val else ""

    @classmethod
    def _get_smtp_password(cls) -> str:
        val: Optional[str] = getattr(settings, "SMTP_PASSWORD", None) or os.getenv("SMTP_PASSWORD", "")
        return str(val).replace(" ", "").strip() if val else ""

    @classmethod
    def _get_from_address(cls) -> str:
        name: str = getattr(settings, "SMTP_FROM_NAME", "Black Market MTG")
        user_email: str = cls._get_smtp_user()
        raw_email: Optional[str] = (
            getattr(settings, "SMTP_FROM_EMAIL", None)
            or os.getenv("SMTP_FROM_EMAIL", None)
            or user_email
            or "no-reply@blackmarket-mtg.local"
        )
        return formataddr((name, str(raw_email).strip()))

    @classmethod
    def _is_smtp_configured(cls) -> bool:
        host: str = cls._get_smtp_host()
        user: str = cls._get_smtp_user()
        pwd: str = cls._get_smtp_password()
        configured: bool = bool(host and user and pwd)

        if not configured:
            missing: List[str] = []
            if not host:
                missing.append("SMTP_HOST")
            if not user:
                missing.append("SMTP_USER")
            if not pwd:
                missing.append("SMTP_PASSWORD")
            print(f"ℹ️ [EmailService] SMTP incompleto. Faltan variables: {', '.join(missing)}")
        return configured

    @classmethod
    def send_verification_otp(
        cls,
        to_email: str,
        username: str,
        otp_code: str,
        is_update: bool = False
    ) -> bool:
        """
        Envía un código OTP de 6 dígitos mediante la cuenta de Gmail configurada.
        """
        subject: str = (
            "Verifica tu nuevo correo - Black Market MTG"
            if is_update
            else "Código de Verificación - Black Market MTG"
        )
        
        action_text: str = (
            "confirmar el cambio de correo en tu perfil"
            if is_update
            else "activar tu cuenta y verificar tu identidad"
        )

        text_content: str = f"""
Hola @{username},

Tu código de verificación para {action_text} es: {otp_code}

Este código tiene una vigencia de 10 minutos. Si no solicitaste esta acción, puedes ignorar este mensaje de forma segura.
"""

        html_content: str = f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: monospace, sans-serif; background-color: #0d0b11; color: #f5f5f5; padding: 20px; }}
    .container {{ max-width: 520px; margin: auto; background-color: #141219; border: 1px solid #2a2733; border-radius: 20px; padding: 32px; }}
    .badge {{ display: inline-block; padding: 4px 12px; background: rgba(232, 139, 0, 0.1); border: 1px solid rgba(232, 139, 0, 0.4); border-radius: 20px; color: #e88b00; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
    .code-box {{ margin: 24px 0; padding: 18px; background-color: #1a1722; border: 1px dashed #e88b00; border-radius: 14px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ff9d0a; }}
    .footer {{ font-size: 11px; color: #737373; margin-top: 24px; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Black Market MTG</span>
    <h2 style="margin-top: 14px; color: #ffffff;">Hola, @{username}</h2>
    <p style="color: #a3a3a3; font-size: 13px; line-height: 1.6;">
      Ingresa el siguiente código de 6 dígitos para {action_text}:
    </p>
    <div class="code-box">{otp_code}</div>
    <p style="color: #737373; font-size: 11px;">
      Este código expirará en 10 minutos. Si no realizaste esta solicitud, puedes ignorar este correo de forma segura.
    </p>
    <div class="footer">
      Black Market MTG · Intercambio P2P Seguro y Verificado
    </div>
  </div>
</body>
</html>
"""

        # 1. Fallback Mock si no hay credenciales
        if not cls._is_smtp_configured():
            print("\n" + "=" * 65)
            print("📨 [EMAIL SERVICE - MOCK LOCAL ACTIVADO]")
            print(f"Destinatario: {to_email} (@{username})")
            print(f"Asunto: {subject}")
            print(f"CÓDIGO DE VERIFICACIÓN (OTP): >>> {otp_code} <<<")
            print("=" * 65 + "\n")
            return True

        # 2. Despacho SMTP (Gmail)
        host: str = cls._get_smtp_host()
        port: int = cls._get_smtp_port()
        user: str = cls._get_smtp_user()
        password: str = cls._get_smtp_password()
        from_header: str = cls._get_from_address()

        try:
            msg: MIMEMultipart = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = to_email

            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            print(f"🚀 [EmailService] Conectando a Gmail ({host}:{port}) con usuario {user}...")

            # Si el puerto es 465, usa SSL directo; si es 587, usa STARTTLS
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                    server.login(user, password)
                    server.sendmail(user, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(user, password)
                    server.sendmail(user, [to_email], msg.as_string())

            logger.info("Correo de verificación enviado exitosamente a %s", to_email)
            print(f"✅ [EmailService] Correo enviado exitosamente a {to_email}")
            return True

        except Exception as exc:
            logger.error("Error al despachar correo a %s: %s", to_email, exc)
            print(f"❌ [EmailService] Falló el despacho a {to_email}: {type(exc).__name__} - {exc}")
            print(f"⚠️ [CÓDIGO OTP DE RESCATE]: >>> {otp_code} <<<")
            return False