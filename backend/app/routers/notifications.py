# app/routers/notifications.py
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.core.security import get_current_user, decode_access_token
from app.core.websockets import manager

router = APIRouter(tags=["Notifications"])


@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id=user_id, websocket=websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id=user_id, websocket=websocket)


@router.get("/api/notifications")
def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.patch("/api/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada."
        )

    notification.is_read = True
    db.commit()
    return {"message": "Notificación marcada como leída.", "id": notification.id}