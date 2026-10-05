# tests/test_notifications.py
import pytest
from fastapi.testclient import TestClient

from app.models.user import User
from app.models.notification import Notification
from app.core.security import create_access_token


@pytest.fixture
def notification_user(db_session):
    user = User(
        id="user-notif-test-01",
        username="notif_receiver",
        email="notif@test.com",
        is_phone_verified=True,
        reputation_score=100
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_list_and_read_notifications(client: TestClient, db_session, notification_user):
    user = notification_user

    # 1. Crear notificaciones de prueba en la base de datos
    n1 = Notification(
        id="notif-uuid-001",
        user_id=user.id,
        event_type="trade_proposed",
        title="Nueva propuesta",
        message="Tienes una nueva propuesta de intercambio.",
        is_read=False
    )
    n2 = Notification(
        id="notif-uuid-002",
        user_id=user.id,
        event_type="trade_accepted",
        title="Propuesta aceptada",
        message="Tu propuesta fue aceptada.",
        is_read=True
    )
    db_session.add_all([n1, n2])
    db_session.commit()

    token = create_access_token(user_id=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Listar todas las notificaciones
    res = client.get("/api/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2

    # 3. Filtrar solo no leídas
    res_unread = client.get("/api/notifications?unread_only=true", headers=headers)
    assert res_unread.status_code == 200
    unread_data = res_unread.json()
    assert len(unread_data) == 1
    assert unread_data[0]["id"] == n1.id

    # 4. Marcar como leída
    res_patch = client.patch(f"/api/notifications/{n1.id}/read", headers=headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["id"] == n1.id

    # 5. Comprobar actualización en BD
    db_session.refresh(n1)
    assert n1.is_read is True


def test_notifications_unauthorized_access(client: TestClient):
    # Intento sin token de autenticación
    res = client.get("/api/notifications")
    assert res.status_code == 401