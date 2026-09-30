# tests/test_routers_security.py
from fastapi import status
from app.models.collection import Collection


def test_public_profile_does_not_leak_pii(client, auth_headers_user_a, test_user_b):
    """
    Verifica: El perfil de otro usuario NO expone email ni teléfono.
    """
    response = client.get(
        f"/api/users/{test_user_b.id}/profile",
        headers=auth_headers_user_a
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "email" not in data
    assert "phone_number" not in data
    assert data["username"] == test_user_b.username
    assert data["reputation_score"] == 95
    assert "kpis" in data


def test_my_profile_returns_private_pii(client, auth_headers_user_a, test_user_a):
    """
    El perfil propio en /me/profile sí contiene los datos privados del dueño.
    """
    response = client.get(
        "/api/users/me/profile",
        headers=auth_headers_user_a
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["email"] == test_user_a.email
    assert data["phone_number"] == test_user_a.phone_number
    assert data["is_phone_verified"] is True


def test_anonymous_cannot_list_users(client):
    """
    Verifica: La enumeración de usuarios exige autenticación JWT.
    """
    response = client.get("/api/users/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_request_otp_prevents_user_enumeration(client, test_user_a):
    """
    Verifica: request-otp responde con el mismo mensaje si el teléfono existe o no.
    """
    res_existente = client.post(
        "/api/auth/request-otp",
        json={"phone_number": test_user_a.phone_number}
    )
    assert res_existente.status_code == status.HTTP_200_OK
    data_existente = res_existente.json()

    res_no_existente = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+573999999999"}
    )
    assert res_no_existente.status_code == status.HTTP_200_OK
    data_no_existente = res_no_existente.json()

    assert data_existente["message"] == data_no_existente["message"]
    assert "dev_otp_code" not in data_existente
    assert "dev_otp_code" not in data_no_existente


def test_idor_protection_delete_card_from_collection(client, db_session, test_user_b, auth_headers_user_a):
    """
    Verifica prevención de IDOR: User A no puede eliminar cartas de una colección de User B.
    """
    col_b = Collection(
        id="col-beta-999",
        user_id=test_user_b.id,
        name="Binder Secreto Beta",
        is_public_trade=True
    )
    db_session.add(col_b)
    db_session.commit()

    response = client.delete(
        f"/api/collections/{col_b.id}/cards/carta-fantasma-123",
        headers=auth_headers_user_a
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_anonymous_cannot_view_private_collection_cards(client, db_session, test_user_a):
    """
    Verifica diseño anti-enumeración: Terceros o anónimos reciben 404 ante un binder privado.
    """
    private_col = Collection(
        id="col-priv-anon-1",
        name="Binder Privado Test",
        user_id=test_user_a.id,
        is_public_trade=False
    )
    db_session.add(private_col)
    db_session.commit()

    response = client.get(f"/api/collections/{private_col.id}/cards")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "no encontrada" in response.json()["detail"].lower()


def test_owner_can_view_private_collection_cards(client, db_session, test_user_a, auth_headers_user_a):
    """
    Verifica que el propietario autenticado sí pueda ver las cartas de su binder privado.
    """
    private_col = Collection(
        id="col-priv-owner-2",
        name="Binder Privado Dueño",
        user_id=test_user_a.id,
        is_public_trade=False
    )
    db_session.add(private_col)
    db_session.commit()

    response = client.get(
        f"/api/collections/{private_col.id}/cards", 
        headers=auth_headers_user_a
    )
    assert response.status_code == status.HTTP_200_OK