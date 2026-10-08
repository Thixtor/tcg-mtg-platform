# app/services/email_service.py
# ============================================================================
# SERVICIO DE CORREO ELECTRÓNICO (DUAL MOCK / SMTP TRANSPARENTE)
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Resolución prioritaria mediante app.core.config.settings con fallback a os.getenv.
# - Si no hay servidor SMTP configurado, imprime el OTP en los logs de Docker
#   con banner visual de consola para desarrollo continuo.
# - Si existen variables SMTP (Gmail, Resend, etc.), despacha vía smtplib con STARTTLS.
# ============================================================================

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional
import logging

from app.core.config import settings

logger: logging.Logger = logging.getLogger("app.email_service")


class EmailService:
    """Gestor unificado de notificaciones y verificación por correo electrónico."""

    @classmethod
    def _get_smtp_host(cls) -> str:
        return str(getattr(settings, "SMTP_HOST", "") or os.getenv("SMTP_HOST", "")).strip()

    @classmethod
    def _get_smtp_port(cls) -> int:
        port_val = getattr(settings, "SMTP_PORT", None) or os.getenv("SMTP_PORT", "587")
        try:
            return int(port_val)
        except (ValueError, TypeError):
            return 587

    @classmethod
    def _get_smtp_user(cls) -> str:
        return str(getattr(settings, "SMTP_USER", "") or os.getenv("SMTP_USER", "")).strip()

    @classmethod
    def _get_smtp_password(cls) -> str:
        return str(getattr(settings, "SMTP_PASSWORD", "") or os.getenv("SMTP_PASSWORD", "")).strip()

    @classmethod
    def _get_from_address(cls) -> str:
        name: str = getattr(settings, "SMTP_FROM_NAME", "Black Market MTG")
        raw_email: Optional[str] = (
            getattr(settings, "SMTP_FROM_EMAIL", None)
            or cls._get_smtp_user()
            or os.getenv("SMTP_FROM", "no-reply@blackmarket-mtg.local")
        )
        return formataddr((name, str(raw_email).strip()))

    @classmethod
    def _is_smtp_configured(cls) -> bool:
        return bool(cls._get_smtp_host() and cls._get_smtp_user() and cls._get_smtp_password())

    @classmethod
    def send_verification_otp(
        cls,
        to_email: str,
        username: str,
        otp_code: str,
        is_update: bool = False
    ) -> bool:
        """
        Envía un código OTP de 6 dígitos para verificar correo en registro o actualización.
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

        # 1. Fallback Mock: Si no hay SMTP configurado, emitir en el logger de consola/Docker
        if not cls._is_smtp_configured():
            print("\n" + "=" * 65)
            print("📨 [EMAIL SERVICE - MOCK LOCAL DOCKER]")
            print(f"Para: {to_email} (@{username})")
            print(f"Asunto: {subject}")
            print(f"CÓDIGO DE VERIFICACIÓN (OTP): >>> {otp_code} <<<")
            print("=" * 65 + "\n")
            return True

        # 2. Despacho real mediante servidor SMTP
        try:
            from_header: str = cls._get_from_address()
            msg: MIMEMultipart = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = to_email

            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            host: str = cls._get_smtp_host()
            port: int = cls._get_smtp_port()
            user: str = cls._get_smtp_user()
            password: str = cls._get_smtp_password()

            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(user, [to_email], msg.as_string())

            logger.info("Correo de verificación enviado exitosamente a %s", to_email)
            return True
        except Exception as e:
            logger.error("Error al despachar correo a %s: %s", to_email, e)
            print(f"⚠️ [FALLO SMTP] Código de rescate para {to_email}: >>> {otp_code} <<<")
            return False