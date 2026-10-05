# app/services/notification_service.py
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.notification import Notification
from app.models.user import User
from app.core.websockets import manager
from app.database import SessionLocal

logger = logging.getLogger("notifications")


class NotificationService:
    @classmethod
    async def create_and_send(
        cls,
        db: Session,
        user_id: str,
        event_type: str,
        title: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Optional[Notification]:
        # Validar existencia del usuario destinatario
        user_exists = db.query(User.id).filter(User.id == user_id).first()
        if not user_exists:
            logger.warning(f"No se pudo crear notificación: usuario {user_id} inexistente.")
            return None

        # 1. Guardar en base de datos
        notification = Notification(
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            payload=payload or {}
        )
        db.add(notification)
        try:
            db.commit()
            db.refresh(notification)
        except IntegrityError as exc:
            db.rollback()
            logger.warning(f"Error de integridad al guardar notificación para {user_id}: {exc}")
            return None

        # 2. Despachar vía WebSocket si el usuario está en línea
        event_data = {
            "id": notification.id,
            "event_type": notification.event_type,
            "title": notification.title,
            "message": notification.message,
            "payload": notification.payload,
            "created_at": notification.created_at.isoformat()
        }
        await manager.send_personal_message(user_id=user_id, message=event_data)

        return notification


async def dispatch_notification_task(
    user_id: str,
    event_type: str,
    title: str,
    message: str,
    payload: Optional[Dict[str, Any]] = None
):
    """Tarea asíncrona segura para BackgroundTasks con sesión de BD propia."""
    db = SessionLocal()
    try:
        await NotificationService.create_and_send(
            db=db,
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            payload=payload
        )
    except Exception as e:
        logger.error(f"Fallo al despachar notificación en segundo plano para {user_id}: {e}")
    finally:
        db.close()