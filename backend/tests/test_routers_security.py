# tests/test_routers_security.py
# ---------------------------------------------------------
# SUITE DE PRUEBAS: SEGURIDAD, AUTENTICACIÓN Y PROTECCIÓN PII (DDD)
# ---------------------------------------------------------
"""
Módulo de pruebas de integración de seguridad y control de acceso.
Valida la mitigación de fuga de información de identificación personal (PII),
prevención de ataques de enumeración sobre OTP por correo electrónico,
control de acceso basado en roles/propietario y mitigación de IDOR.
"""

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.collection import Collection
from app.models.user import User


# ---------------------------------------------------------
# 1. PRUEBAS DE PRIVACIDAD Y PROTECCIÓN DE DATOS (PII)
# ---------------------------------------------------------

def test_public_profile_does_not_leak_pii(
    client: TestClient, 
    auth_headers_user_a: dict, 
    test_user_b: User
) -> None:
    """
    Verifica que la consulta del perfil público de un tercero oculte estrictamente
    información sensible (PII: email, número de teléfono) según la política de privacidad.
    """
    # Act: Consultar perfil de usuario ajeno
    response = client.get(
        f"/api/users/{test_user_b.id}/profile",
        headers=auth_headers_user_a
    )

    # Assert: Estado 200 pero sin campos sensibles en el payload
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "email" not in data, "Fuga de seguridad: El email fue expuesto en el perfil público"
    assert "phone_number" not in data, "Fuga de seguridad: El teléfono fue expuesto en el perfil público"
    assert data["username"] == test_user_b.username
    assert data["reputation_score"] == 95
    assert "kpis" in data


def test_my_profile_returns_private_pii(
    client: TestClient, 
    auth_headers_user_a: dict, 
    test_user_a: User
) -> None:
    """
    Verifica que el endpoint de perfil propio (/me/profile) sí entregue
    la totalidad de los datos privados y credenciales de contacto al titular de la sesión.
    """
    # Act: El propietario consulta su propio perfil
    response = client.get(
        "/api/users/me/profile",
        headers=auth_headers_user_a
    )

    # Assert: Estado 200 con verificación completa de atributos privados
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["email"] == test_user_a.email
    assert data["phone_number"] == test_user_a.phone_number
    assert data["is_phone_verified"] is True


# ---------------------------------------------------------
# 2. PRUEBAS DE AUTENTICACIÓN, SESIÓN Y ANTI-ENUMERACIÓN
# ---------------------------------------------------------

def test_anonymous_cannot_list_users(client: TestClient) -> None:
    """
    Verifica el control de acceso inicial: La enumeración de identidades
    exige credenciales Bearer JWT válidas, bloqueando peticiones no autenticadas.
    """
    # Act & Assert: Petición anónima rechazada con 401 Unauthorized
    response = client.get("/api/users/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_request_otp_prevents_user_enumeration(
    client: TestClient, 
    test_user_a: User
) -> None:
    """
    Verifica la protección contra ataques de enumeración mediante tiempo y respuesta:
    El endpoint /api/auth/request-otp debe responder exactamente el mismo mensaje opaco
    tanto si el correo electrónico existe en la base de datos como si no está registrado.
    """
    # Arrange: Payloads para usuario existente vs inexistente vía Email
    payload_existente = {"email": test_user_a.email}
    payload_inexistente = {"email": "noexiste@example.com"}

    # Act: Enviar desafío a ambos correos
    res_existente = client.post("/api/auth/request-otp", json=payload_existente)
    res_no_existente = client.post("/api/auth/request-otp", json=payload_inexistente)

    # Assert: Respuestas HTTP 200 idénticas y sin filtración de OTP en entorno seguro
    assert res_existente.status_code == status.HTTP_200_OK
    assert res_no_existente.status_code == status.HTTP_200_OK

    data_existente = res_existente.json()
    data_no_existente = res_no_existente.json()

    assert data_existente["message"] == data_no_existente["message"], (
        "Vulnerabilidad de enumeración: El mensaje varía según la existencia del usuario"
    )
    assert "dev_otp_code" not in data_existente
    assert "dev_otp_code" not in data_no_existente


# ---------------------------------------------------------
# 3. CONTROL DE ACCESO A RECURSOS E IDOR (INSECURE DIRECT OBJECT REFERENCE)
# ---------------------------------------------------------

def test_idor_protection_delete_card_from_collection(
    client: TestClient, 
    db_session: Session, 
    test_user_b: User, 
    auth_headers_user_a: dict
) -> None:
    """
    Verifica la prevención de manipulación indebida de objetos (IDOR):
    El Usuario A autenticado no puede eliminar cartas de un binder perteneciente al Usuario B.
    """
    # Arrange: Crear colección perteneciente al Usuario B
    col_b = Collection(
        id="col-beta-999",
        user_id=test_user_b.id,
        name="Binder Secreto Beta",
        is_public_trade=True
    )
    db_session.add(col_b)
    db_session.commit()

    # Act: Usuario A intenta ejecutar DELETE sobre el recurso de Usuario B
    response = client.delete(
        f"/api/collections/{col_b.id}/cards/carta-fantasma-123",
        headers=auth_headers_user_a
    )

    # Assert: El sistema responde 404 para no confirmar la existencia de recursos ajenos
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_anonymous_cannot_view_private_collection_cards(
    client: TestClient, 
    db_session: Session, 
    test_user_a: User
) -> None:
    """
    Verifica el diseño anti-enumeración de inventario privado:
    Un usuario anónimo o tercero recibe un 404 ante un binder marcado como no público.
    """
    # Arrange: Colección estrictamente privada de Usuario A
    private_col = Collection(
        id="col-priv-anon-1",
        name="Binder Privado Test",
        user_id=test_user_a.id,
        is_public_trade=False
    )
    db_session.add(private_col)
    db_session.commit()

    # Act: Intento de lectura anónima
    response = client.get(f"/api/collections/{private_col.id}/cards")

    # Assert: 404 Not Found opaco
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "no encontrada" in response.json()["detail"].lower()


def test_owner_can_view_private_collection_cards(
    client: TestClient, 
    db_session: Session, 
    test_user_a: User, 
    auth_headers_user_a: dict
) -> None:
    """
    Verifica los permisos legítimos del titular del recurso:
    El propietario autenticado sí puede acceder al listado de cartas de su propio binder privado.
    """
    # Arrange: Colección privada de Usuario A
    private_col = Collection(
        id="col-priv-owner-2",
        name="Binder Privado Dueño",
        user_id=test_user_a.id,
        is_public_trade=False
    )
    db_session.add(private_col)
    db_session.commit()

    # Act: El dueño legítimo consulta su colección privada
    response = client.get(
        f"/api/collections/{private_col.id}/cards", 
        headers=auth_headers_user_a
    )

    # Assert: Acceso concedido con 200 OK
    assert response.status_code == status.HTTP_200_OK