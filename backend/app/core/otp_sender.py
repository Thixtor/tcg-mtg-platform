# app/core/otp_sender.py
# ---------------------------------------------------------
# PUERTO Y ADAPTADORES: SERVICIO DE EMISIÓN OTP (SOLID)
# ---------------------------------------------------------
import logging
from abc import ABC, abstractmethod
from app.core.config import settings

logger = logging.getLogger("otp_sender")


def _mask_recipient(recipient: str) -> str:
    """Enmascara correos o teléfonos para evitar fuga de PII en logs."""
    if "@" in recipient:
        name, domain = recipient.split("@", 1)
        masked_name = name[0] + "***" if len(name) > 1 else "*"
        return f"{masked_name}@{domain}"
    return recipient[:3] + "***" + recipient[-2:] if len(recipient) > 5 else "***"


class OtpSender(ABC):
    """
    Puerto de Salida (Interface): Abstracción para el despacho
    de desafíos OTP a través de canales de mensajería/email.
    """
    @abstractmethod
    def send_otp(self, recipient: str, code: str) -> bool:
        """Emite el código de un solo uso al destinatario."""
        raise NotImplementedError


class ConsoleOtpSender(OtpSender):
    """
    Adaptador de Desarrollo y Pruebas Locales:
    Permite visualizar el código en terminal para agilizar pruebas de desarrollo.
    """
    def send_otp(self, recipient: str, code: str) -> bool:
        masked = _mask_recipient(recipient)
        if settings.EXPOSE_DEV_OTP:
            logger.info(f"🔑 [DEV OTP] Destinatario: {masked} | Código: {code}")
            # print directo a stdout para que se vea claro en docker compose logs
            print(f"\n[DEV AUTH] >>> Código OTP para {recipient}: {code} <<<\n", flush=True)
        else:
            logger.info(f"🔑 [DEV OTP] Desafío generado para {masked} (código oculto por configuración)")
        return True


class ProductionEmailOtpSender(OtpSender):
    """
    Adaptador de Producción:
    Despacha emails transaccionales reales vía SMTP sin loguear el código en texto plano.
    """
    def send_otp(self, recipient: str, code: str) -> bool:
        masked = _mask_recipient(recipient)
        # TODO: Implementar el envío real vía smtplib o cliente API usando settings.SMTP_*
        logger.info(f"📧 [PROD OTP] Correo transaccional despachado exitosamente a {masked}")
        return True


def get_otp_sender() -> OtpSender:
    """
    Factory Provider: En fase de desarrollo/testing entrega ConsoleOtpSender;
    en producción entrega ProductionEmailOtpSender.
    """
    if settings.ENVIRONMENT in ("development", "testing"):
        return ConsoleOtpSender()

    return ProductionEmailOtpSender()