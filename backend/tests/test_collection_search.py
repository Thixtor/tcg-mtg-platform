# tests/test_collection_search.py
# ---------------------------------------------------------
# PRUEBAS DE INTEGRACIÓN: BÚSQUEDA EN INVENTARIO DE USUARIO
# ---------------------------------------------------------
import pytest
from app.models.card import CartaScryfall
from app.models.collection import Collection, UserCard
from app.models.user import User
from app.core.security import create_access_token
from app.core.config import settings


def _create_card(db_session, card_id: str, name: str, color_identity: str, type_line: str, cmc: float = 1.0) -> CartaScryfall:
    card = db_session.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not card:
        kwargs = {
            "id": card_id,
            "name": name,
            "color_identity": color_identity,
            "type_line": type_line,
            "cmc": cmc,
        }
        optional_fields = {
            "set": "TEST",
            "collector_number": card_id[-3:],
            "oracle_text": "",
            "scryfall_raw_data": {}
        }
        for field, value in optional_fields.items():
            if hasattr(CartaScryfall, field):
                kwargs[field] = value

        card = CartaScryfall(**kwargs)
        db_session.add(card)
        db_session.commit()
        db_session.refresh(card)
    return card


def test_search_user_inventory_filters(client, db_session):
    # 1. Crear usuarios
    user_a = User(username="inventory_user_a", email="user_a@example.com")
    user_b = User(username="inventory_user_b", email="user_b@example.com")
    db_session.add_all([user_a, user_b])
    db_session.commit()

    # 2. Crear colecciones
    col_a = Collection(user_id=str(user_a.id), name="Binder Principal A")
    col_b = Collection(user_id=str(user_b.id), name="Binder de B")
    db_session.add_all([col_a, col_b])
    db_session.commit()

    # 3. Crear cartas canónicas
    sol_ring = _create_card(db_session, "inv-sol-01", "Sol Ring", "", "Artifact", 1.0)
    counterspell = _create_card(db_session, "inv-cs-02", "Counterspell", "U", "Instant", 2.0)
    bolt = _create_card(db_session, "inv-bolt-03", "Lightning Bolt", "R", "Instant", 1.0)

    # 4. Asignar cartas al inventario de User A
    uc1 = UserCard(
        collection_id=col_a.id,
        scryfall_card_id=sol_ring.id,
        quantity=2,
        condition="NM",
        is_foil=False,
        is_for_trade=True
    )
    uc2 = UserCard(
        collection_id=col_a.id,
        scryfall_card_id=counterspell.id,
        quantity=1,
        condition="LP",
        is_foil=True,
        is_for_trade=False
    )
    # Carta de User B (no debe aparecer en búsquedas de User A)
    uc_b = UserCard(
        collection_id=col_b.id,
        scryfall_card_id=bolt.id,
        quantity=4,
        condition="NM",
        is_foil=False,
        is_for_trade=True
    )
    db_session.add_all([uc1, uc2, uc_b])
    db_session.commit()

    # 5. Generar token de autenticación para User A
    token = create_access_token(user_id=str(user_a.id))
    headers = {"Authorization": f"Bearer {token}"}
    base_endpoint = f"{settings.API_V1_STR}/collections/cards/search"

    # Test 1: Búsqueda general (debe retornar solo las 2 cartas de User A)
    res = client.get(base_endpoint, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

    # Test 2: Búsqueda por texto (Sol Ring)
    res_text = client.get(f"{base_endpoint}?q=Sol", headers=headers)
    assert res_text.status_code == 200
    assert res_text.json()["total"] == 1
    assert res_text.json()["items"][0]["card_name"] == "Sol Ring"

    # Test 3: Filtro por color (Azul 'U')
    res_color = client.get(f"{base_endpoint}?color=U", headers=headers)
    assert res_color.status_code == 200
    assert res_color.json()["total"] == 1
    assert res_color.json()["items"][0]["card_name"] == "Counterspell"

    # Test 4: Filtro físico for_trade=true
    res_trade = client.get(f"{base_endpoint}?for_trade=true", headers=headers)
    assert res_trade.status_code == 200
    assert res_trade.json()["total"] == 1
    assert res_trade.json()["items"][0]["card_name"] == "Sol Ring"

    # Test 5: Aislamiento multi-tenant (Lightning Bolt de User B no debe aparecer)
    res_bolt = client.get(f"{base_endpoint}?q=Bolt", headers=headers)
    assert res_bolt.status_code == 200
    assert res_bolt.json()["total"] == 0