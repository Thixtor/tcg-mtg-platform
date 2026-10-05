# tests/test_wishlist_most_wanted.py
# ---------------------------------------------------------
# PRUEBAS DE INTEGRACIÓN: CARTAS MÁS DESEADAS (MOST WANTED)
# ---------------------------------------------------------
import pytest
from app.models.card import CartaScryfall
from app.models.wishlist import WishlistItem
from app.models.user import User
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


def test_most_wanted_cards_ranking_and_filters(client, db_session):
    # 0. Asegurar aislamiento limpiando Wishlist residual en entorno de integración
    db_session.query(WishlistItem).delete()
    db_session.commit()

    # 1. Crear 3 usuarios
    u1 = User(username="wanted_user_1", email="w1@example.com")
    u2 = User(username="wanted_user_2", email="w2@example.com")
    u3 = User(username="wanted_user_3", email="w3@example.com")
    db_session.add_all([u1, u2, u3])
    db_session.commit()

    # 2. Crear cartas canónicas
    sol_ring = _create_card(db_session, "mw-sol-01", "Sol Ring", "", "Artifact", 1.0)
    counterspell = _create_card(db_session, "mw-cs-02", "Counterspell", "U", "Instant", 2.0)
    rhystic = _create_card(db_session, "mw-rs-03", "Rhystic Study", "U", "Enchantment", 3.0)

    # 3. Poblar Wishlists:
    # Sol Ring: Querido por u1 (1 copia), u2 (2 copias), u3 (1 copia) -> 3 usuarios, 4 copias
    # Rhystic Study: Querido por u1 (1 copia), u2 (1 copia) -> 2 usuarios, 2 copias
    # Counterspell: Querido por u3 (4 copias) -> 1 usuario, 4 copias
    w_items = [
        WishlistItem(user_id=str(u1.id), scryfall_card_id=sol_ring.id, quantity=1, priority="alta"),
        WishlistItem(user_id=str(u2.id), scryfall_card_id=sol_ring.id, quantity=2, priority="alta"),
        WishlistItem(user_id=str(u3.id), scryfall_card_id=sol_ring.id, quantity=1, priority="media"),

        WishlistItem(user_id=str(u1.id), scryfall_card_id=rhystic.id, quantity=1, priority="alta"),
        WishlistItem(user_id=str(u2.id), scryfall_card_id=rhystic.id, quantity=1, priority="media"),

        WishlistItem(user_id=str(u3.id), scryfall_card_id=counterspell.id, quantity=4, priority="baja"),
    ]
    db_session.add_all(w_items)
    db_session.commit()

    endpoint = f"{settings.API_V1_STR}/wishlist/most-wanted"

    # Test 1: Ranking general ordenado por users_count DESC
    res = client.get(endpoint)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    items = data["items"]

    # Posición 1: Sol Ring (3 usuarios, 4 copias)
    assert items[0]["card_name"] == "Sol Ring"
    assert items[0]["users_count"] == 3
    assert items[0]["total_copies_wanted"] == 4

    # Posición 2: Rhystic Study (2 usuarios, 2 copias)
    assert items[1]["card_name"] == "Rhystic Study"
    assert items[1]["users_count"] == 2
    assert items[1]["total_copies_wanted"] == 2

    # Posición 3: Counterspell (1 usuario, 4 copias)
    assert items[2]["card_name"] == "Counterspell"
    assert items[2]["users_count"] == 1
    assert items[2]["total_copies_wanted"] == 4

    # Test 2: Filtro por color (Azul 'U') -> Debe excluir Sol Ring (incoloro)
    res_blue = client.get(f"{endpoint}?color=U")
    assert res_blue.status_code == 200
    blue_items = res_blue.json()["items"]
    assert len(blue_items) == 2
    assert {it["card_name"] for it in blue_items} == {"Rhystic Study", "Counterspell"}

    # Test 3: Filtro por tipo de carta ('Instant') -> Solo Counterspell
    res_instant = client.get(f"{endpoint}?card_type=Instant")
    assert res_instant.status_code == 200
    instant_items = res_instant.json()["items"]
    assert len(instant_items) == 1
    assert instant_items[0]["card_name"] == "Counterspell"

    # Test 4: Parámetro limit=1 -> Solo el top 1
    res_limit = client.get(f"{endpoint}?limit=1")
    assert res_limit.status_code == 200
    assert len(res_limit.json()["items"]) == 1
    assert res_limit.json()["items"][0]["card_name"] == "Sol Ring"