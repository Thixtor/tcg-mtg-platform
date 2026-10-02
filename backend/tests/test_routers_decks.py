from fastapi import status
from app.models.card import CartaScryfall
from app.models.deck import Deck


def create_db_card(db_session, card_id: str, name: str, type_line: str = "Instant", cmc: float = 1.0) -> CartaScryfall:
    card = CartaScryfall(
        id=card_id,
        name=name,
        set="eld",
        type_line=type_line,
        mana_cost="{1}",
        cmc=cmc,
        rarity="rare",
        colors="U",
        scryfall_raw_data={"id": card_id, "name": name}
    )
    db_session.add(card)
    db_session.commit()
    return card


def test_create_deck_success(client, auth_headers_user_a):
    response = client.post(
        "/api/decks",
        headers=auth_headers_user_a,
        json={
            "name": "Mazo Simic Combo",
            "format": "Commander",
            "description": "Prueba de creación"
        }
    )
    # Soporta tanto /api/decks como /decks según montaje
    if response.status_code == status.HTTP_404_NOT_FOUND:
        response = client.post(
            "/decks",
            headers=auth_headers_user_a,
            json={
                "name": "Mazo Simic Combo",
                "format": "Commander",
                "description": "Prueba de creación"
            }
        )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Mazo Simic Combo"
    assert data["format"] == "Commander"
    assert "id" in data


def test_create_deck_quota_limit(client, db_session, test_user_a, auth_headers_user_a):
    for i in range(10):
        db_session.add(
            Deck(id=f"deck-limit-{i}", user_id=test_user_a.id, name=f"Mazo {i}", format="Commander")
        )
    db_session.commit()

    url = "/api/decks"
    response = client.post(
        url,
        headers=auth_headers_user_a,
        json={"name": "Mazo Extra Prohibido", "format": "Commander"}
    )
    if response.status_code == status.HTTP_404_NOT_FOUND:
        url = "/decks"
        response = client.post(
            url,
            headers=auth_headers_user_a,
            json={"name": "Mazo Extra Prohibido", "format": "Commander"}
        )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "límite máximo de 10" in response.json()["detail"]


def test_add_card_to_deck_and_cover_assignment(client, db_session, auth_headers_user_a, test_user_a):
    create_db_card(db_session, "card-kinnan", "Kinnan, Bonder Prodigy", type_line="Legendary Creature")

    deck = Deck(id="deck-kinnan-1", user_id=test_user_a.id, name="Kinnan EDH", format="Commander")
    db_session.add(deck)
    db_session.commit()

    url = f"/api/decks/{deck.id}/cards"
    response = client.post(
        url,
        headers=auth_headers_user_a,
        json={
            "scryfall_card_id": "card-kinnan",
            "quantity": 1,
            "category": "commander"
        }
    )
    if response.status_code == status.HTTP_404_NOT_FOUND:
        url = f"/decks/{deck.id}/cards"
        response = client.post(
            url,
            headers=auth_headers_user_a,
            json={
                "scryfall_card_id": "card-kinnan",
                "quantity": 1,
                "category": "commander"
            }
        )

    assert response.status_code == status.HTTP_201_CREATED

    db_session.refresh(deck)
    assert deck.featured_card_id == "card-kinnan"


def test_bulk_add_cards_to_deck(client, db_session, auth_headers_user_a, test_user_a):
    create_db_card(db_session, "card-bulk-1", "Sol Ring")
    create_db_card(db_session, "card-bulk-2", "Arcane Signet")

    deck = Deck(id="deck-bulk-test", user_id=test_user_a.id, name="Bulk Test Deck", format="Commander")
    db_session.add(deck)
    db_session.commit()

    payload = {
        "cards": [
            {"scryfall_card_id": "card-bulk-1", "quantity": 1, "category": "mainboard"},
            {"scryfall_card_id": "card-bulk-2", "quantity": 1, "category": "mainboard"},
            {"scryfall_card_id": "card-inexistente-999", "quantity": 1, "category": "mainboard"}
        ]
    }

    url = f"/api/decks/{deck.id}/cards/bulk"
    response = client.post(url, headers=auth_headers_user_a, json=payload)
    if response.status_code == status.HTTP_404_NOT_FOUND:
        url = f"/decks/{deck.id}/cards/bulk"
        response = client.post(url, headers=auth_headers_user_a, json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["added_count"] == 2
    assert "card-inexistente-999" in data["failed_card_ids"]


def test_fork_deck_endpoint(client, db_session, auth_headers_user_b, test_user_a):
    create_db_card(db_session, "card-base", "Birds of Paradise")
    source_deck = Deck(id="deck-source-a", user_id=test_user_a.id, name="Original User A", format="Commander")
    source_deck.add_card("card-base", quantity=1, category="mainboard")
    db_session.add(source_deck)
    db_session.commit()

    url = f"/api/decks/{source_deck.id}/fork?new_name=Forked By User B"
    response = client.post(url, headers=auth_headers_user_b)
    if response.status_code == status.HTTP_404_NOT_FOUND:
        url = f"/decks/{source_deck.id}/fork?new_name=Forked By User B"
        response = client.post(url, headers=auth_headers_user_b)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Forked By User B"
    assert data["user_id"] != test_user_a.id