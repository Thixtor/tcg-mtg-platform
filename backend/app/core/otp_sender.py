# app/core/otp_sender.py
# ---------------------------------------------------------
# PUERTO Y ADAPTADORES: SERVICIO DE EMISIÓN OTP (SOLID)
# ---------------------------------------------------------
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger("otp_sender")


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
    Imprime el código en los logs estructurados del servidor.
    """
    def send_otp(self, recipient: str, code: str) -> bool:
        logger.info(f"🔑 [MOCK OTP DELIVERY] Correo: {recipient} | Código OTP: {code}")
        return True


class ProductionEmailOtpSender(OtpSender):
    """
    Adaptador de Producción:
    Punto de integración con proveedores transaccionales (SMTP, SendGrid, Amazon SES).
    """
    def send_otp(self, recipient: str, code: str) -> bool:
        # TODO: Configurar conexión con el proveedor SMTP/API transaccional en producción
        logger.info(f"📧 [PROD OTP SENT] Despachado a {recipient}")
        return True


def get_otp_sender() -> OtpSender:
    """Factory Provider para inyección de dependencias."""
    # Retorna ConsoleOtpSender para entornos locales/testing y desacopla la infraestructura
    return ConsoleOtpSender()