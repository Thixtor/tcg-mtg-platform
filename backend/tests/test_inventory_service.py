from unittest.mock import MagicMock
from app.services.inventory_service import calculate_deck_availability


def test_calculate_deck_availability_disponible():
    db = MagicMock()

    mock_deck = MagicMock()
    mock_deck.id = "deck-1"
    mock_deck.user_id = "user-1"

    card_catalog = MagicMock()
    card_catalog.name = "Sol Ring"
    card_catalog.set = "LTC"
    card_catalog.image_url = "http://example.com/solring.jpg"

    deck_card = MagicMock()
    deck_card.id = "dc-1"
    deck_card.scryfall_card_id = "card-solring"
    deck_card.quantity = 1
    deck_card.category = "mainboard"
    deck_card.card_catalog = card_catalog

    # Mock de queries
    # 1. Cartas del mazo
    db.query.return_value.options.return_value.filter.return_value.all.return_value = [deck_card]

    # 2. Total poseídas: 2 copias
    # 3. Usadas en otros: 0 copias
    # 4. Nombres de otros mazos: vacio
    db.query.return_value.join.return_value.filter.return_value.group_by.return_value.all.side_effect = [
        [("card-solring", 2)],  # poseidas
        [],                     # usadas en otros mazos
    ]
    db.query.return_value.join.return_value.filter.return_value.all.return_value = []

    res = calculate_deck_availability(db, mock_deck)

    assert len(res) == 1
    assert res[0].status == "DISPONIBLE"
    assert res[0].quantity_needed == 1


def test_calculate_deck_availability_en_otro_mazo():
    db = MagicMock()

    mock_deck = MagicMock()
    mock_deck.id = "deck-1"
    mock_deck.user_id = "user-1"

    deck_card = MagicMock()
    deck_card.id = "dc-1"
    deck_card.scryfall_card_id = "card-cyclonic"
    deck_card.quantity = 1
    deck_card.category = "mainboard"
    deck_card.card_catalog = None

    db.query.return_value.options.return_value.filter.return_value.all.return_value = [deck_card]

    # Posee 1, pero 1 ya está comprometida en otro mazo -> libres = 0
    db.query.return_value.join.return_value.filter.return_value.group_by.return_value.all.side_effect = [
        [("card-cyclonic", 1)],  # poseidas
        [("card-cyclonic", 1)],  # usadas
    ]
    db.query.return_value.join.return_value.filter.return_value.all.return_value = [
        ("card-cyclonic", "Mazo Atraxa")
    ]

    res = calculate_deck_availability(db, mock_deck)

    assert len(res) == 1
    assert res[0].status == "EN_OTRO_MAZO"
    assert "Mazo Atraxa" in res[0].assigned_other_decks


def test_calculate_deck_availability_faltante():
    db = MagicMock()

    mock_deck = MagicMock()
    mock_deck.id = "deck-1"
    mock_deck.user_id = "user-1"

    deck_card = MagicMock()
    deck_card.id = "dc-1"
    deck_card.scryfall_card_id = "card-mox"
    deck_card.quantity = 1
    deck_card.category = "mainboard"
    deck_card.card_catalog = None

    db.query.return_value.options.return_value.filter.return_value.all.return_value = [deck_card]

    # Posee 0 copias
    db.query.return_value.join.return_value.filter.return_value.group_by.return_value.all.side_effect = [
        [],  # poseidas
        [],  # usadas
    ]
    db.query.return_value.join.return_value.filter.return_value.all.return_value = []

    res = calculate_deck_availability(db, mock_deck)

    assert len(res) == 1
    assert res[0].status == "FALTANTE"