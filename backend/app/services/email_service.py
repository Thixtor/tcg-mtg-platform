# app/services/email_service.py
# ============================================================================
# SERVICIO DE CORREO ELECTRÓNICO (DUAL MOCK / SMTP TRANSPARENTE)
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Si no hay servidor SMTP en variables de entorno, imprime el OTP en los logs
#   de Docker con banner visual de consola para desarrollo continuo.
# - Si existen variables SMTP (Gmail, Resend, Sendgrid, etc.), despacha vía smtplib.
# ============================================================================

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import logging

logger = logging.getLogger("app.email_service")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@blackmarket-mtg.local")


class EmailService:
    """Gestor unificado de notificaciones y verificación por correo electrónico."""

    @classmethod
    def _is_smtp_configured(cls) -> bool:
        return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)

    @classmethod
    def send_verification_otp(cls, to_email: str, username: str, otp_code: str, is_update: bool = False) -> bool:
        """
        Envía un código OTP de 6 dígitos para verificar correo en registro o actualización.
        """
        subject = "Verifica tu nuevo correo - Black Market MTG" if is_update else "Código de Verificación - Black Market MTG"
        
        action_text = "confirmar el cambio de correo en tu perfil" if is_update else "activar tu cuenta y verificar tu identidad"

        text_content = f"""
        Hola @{username},

        Tu código de verificación para {action_text} es: {otp_code}

        Este código tiene una vigencia de 10 minutos. Si no solicitaste esta acción, ignora este mensaje.
        """

        html_content = f"""
        <!DOCTYPE html>
        <html>
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

        # 1. Si no hay SMTP configurado, emitir en el logger de Docker
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
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = SMTP_FROM
            msg["To"] = to_email

            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, [to_email], msg.as_string())
            
            logger.info(f"Correo de verificación enviado a {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error al despachar correo a {to_email}: {e}")
            # Respaldo en consola en caso de fallo SMTP para no interrumpir el test local
            print(f"⚠️ [FALLO SMTP] Código de rescate para {to_email}: >>> {otp_code} <<<")
            return False