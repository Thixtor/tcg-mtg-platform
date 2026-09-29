from fastapi import status
from app.models.collection import Collection


def test_public_profile_does_not_leak_pii(client, auth_headers_user_a, test_user_b):
    """
    Verifica C1: El perfil de otro usuario NO expone email ni teléfono.
    """
    response = client.get(
        f"/api/users/{test_user_b.id}/profile",
        headers=auth_headers_user_a
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Validación estricta anti-fuga de PII
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
    Verifica C1: La enumeración de usuarios exige autenticación JWT.
    """
    response = client.get("/api/users/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_request_otp_prevents_user_enumeration(client, test_user_a):
    """
    Verifica C3: request-otp responde con el mismo mensaje si el teléfono existe o no.
    """
    # Teléfono registrado
    res_existente = client.post(
        "/api/auth/request-otp",
        json={"phone_number": test_user_a.phone_number}
    )
    assert res_existente.status_code == status.HTTP_200_OK
    data_existente = res_existente.json()

    # Teléfono no registrado
    res_no_existente = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+573999999999"}
    )
    assert res_no_existente.status_code == status.HTTP_200_OK
    data_no_existente = res_no_existente.json()

    # Ambos deben dar el mismo mensaje y estado
    assert data_existente["message"] == data_no_existente["message"]
    # En testing/prod nunca debe existir dev_otp_code
    assert "dev_otp_code" not in data_existente
    assert "dev_otp_code" not in data_no_existente


def test_idor_protection_delete_card_from_collection(client, db_session, test_user_b, auth_headers_user_a):
    """
    Verifica prevención de IDOR: User A no puede eliminar cartas de una colección de User B.
    """
    # Crear colección de User B
    col_b = Collection(
        id="col-beta-999",
        user_id=test_user_b.id,
        name="Binder Secreto Beta",
        is_public_trade=True
    )
    db_session.add(col_b)
    db_session.commit()

    # User A intenta borrar un recurso en col_b
    response = client.delete(
        f"/api/collections/{col_b.id}/cards/carta-fantasma-123",
        headers=auth_headers_user_a
    )
    # Debe rechazar con 404 para no filtrar existencia del recurso
    assert response.status_code == status.HTTP_404_NOT_FOUND