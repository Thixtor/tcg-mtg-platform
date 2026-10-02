import pytest
from unittest.mock import MagicMock
from app.models.deck import Deck, DeckCard, MTGCardDomainAdapter


def create_mock_catalog_card(
    name: str,
    type_line: str,
    mana_cost: str = "{1}",
    cmc: float = 1.0,
    color_identity: list = None,
    oracle_text: str = ""
) -> MagicMock:
    card = MagicMock()
    card.name = name
    card.type_line = type_line
    card.mana_cost = mana_cost
    card.cmc = cmc
    card.color_identity = color_identity or []
    card.oracle_text = oracle_text
    return card


def test_card_domain_adapter_basic_land_detection():
    # Tierras normales y nevadas
    plains = create_mock_catalog_card("Plains", "Basic Land — Plains")
    adapter_plains = MTGCardDomainAdapter(plains)
    assert adapter_plains.is_basic is True
    assert adapter_plains.is_land is True

    snow_swamp = create_mock_catalog_card("Snow-Covered Swamp", "Basic Snow Land — Swamp")
    adapter_snow = MTGCardDomainAdapter(snow_swamp)
    assert adapter_snow.is_basic is True
    assert adapter_snow.is_land is True

    # Tierras no básicas
    command_tower = create_mock_catalog_card("Command Tower", "Land")
    adapter_tower = MTGCardDomainAdapter(command_tower)
    assert adapter_tower.is_basic is False
    assert adapter_tower.is_land is True


def test_card_domain_adapter_custom_deck_limits():
    # Carta con límite no estándar (Relentless Rats)
    rats = create_mock_catalog_card(
        "Relentless Rats",
        "Creature — Rat",
        oracle_text="A deck can have any number of cards named Relentless Rats."
    )
    adapter_rats = MTGCardDomainAdapter(rats)
    assert adapter_rats.max_allowed_in_deck == float("inf")

    # Carta estándar sin texto de excepción
    bolt = create_mock_catalog_card("Lightning Bolt", "Instant")
    adapter_bolt = MTGCardDomainAdapter(bolt)
    assert adapter_bolt.max_allowed_in_deck is None


def test_deck_aggregate_add_and_aggregate_cards():
    deck = Deck(id="deck-test-1", user_id="user-1", name="Test EDH", format="Commander")
    
    # Agregar carta nueva
    c1 = deck.add_card(scryfall_card_id="card-solring", quantity=1, category="mainboard")
    assert len(deck.cards) == 1
    assert c1.quantity == 1

    # Agregar la misma carta suma cantidad
    deck.add_card(scryfall_card_id="card-solring", quantity=2, category="mainboard")
    assert len(deck.cards) == 1
    assert deck.cards[0].quantity == 3


def test_deck_average_cmc_calculation():
    deck = Deck(id="deck-test-2", user_id="user-1", name="CMC Test", format="Commander")

    card_creature = create_mock_catalog_card("Grizzly Bears", "Creature — Bear", cmc=2.0)
    card_spell = create_mock_catalog_card("Wrath of God", "Sorcery", cmc=4.0)
    card_land = create_mock_catalog_card("Plains", "Basic Land — Plains", cmc=0.0)

    # 2 Osos (CMC 2 c/u) = 4
    # 1 Ira (CMC 4) = 4
    # 2 Tierras (ignoran CMC en promedio)
    dc1 = deck.add_card("card-1", quantity=2, category="mainboard")
    dc1.card_catalog = card_creature

    dc2 = deck.add_card("card-2", quantity=1, category="mainboard")
    dc2.card_catalog = card_spell

    dc3 = deck.add_card("card-3", quantity=2, category="mainboard")
    dc3.card_catalog = card_land

    # (2*2 + 1*4) / 3 permanentes no tierra = 8 / 3 = 2.67
    avg = deck.calculate_average_cmc()
    assert avg == 2.67


def test_commander_legality_validation_failures():
    deck = Deck(id="deck-test-3", user_id="user-1", name="Invalid EDH", format="Commander")

    # 1. Sin comandante
    res = deck.validate_legality()
    assert res["is_legal"] is False
    assert any("al menos un comandante" in issue for issue in res["issues"])

    # 2. Con comandante Mono-Green
    cmd_catalog = create_mock_catalog_card(
        "Omnath, Locus of Mana",
        "Legendary Creature — Elemental",
        color_identity=["G"]
    )
    cmd_card = deck.add_card("omnath-id", quantity=1, category="commander")
    cmd_card.card_catalog = cmd_catalog

    # 3. Carta que viola identidad de color (Azul en mazo Verde)
    blue_card = create_mock_catalog_card(
        "Counterspell",
        "Instant",
        color_identity=["U"]
    )
    dc_blue = deck.add_card("counterspell-id", quantity=1, category="mainboard")
    dc_blue.card_catalog = blue_card

    # 4. Violación de Singleton (2 copias de carta que no es tierra básica)
    dc_dupe = deck.add_card("dupe-id", quantity=2, category="mainboard")
    dc_dupe.card_catalog = create_mock_catalog_card("Llanowar Elves", "Creature — Elf", color_identity=["G"])

    legality = deck.validate_legality()
    assert legality["is_legal"] is False
    # Conteo diferente de 100 cartas
    assert any("debe tener exactamente 100 cartas" in issue for issue in legality["issues"])
    # Identidad de color violada
    assert any("identidad del comandante" in issue for issue in legality["issues"])
    # Singleton violado
    assert any("Regla Singleton violada" in issue for issue in legality["issues"])


def test_deck_fork_behavior():
    original_deck = Deck(
        id="deck-orig",
        user_id="user-author",
        name="Elves Ramp",
        format="Commander",
        description="Tribal deck"
    )
    original_deck.add_card("card-1", quantity=1, category="commander")
    original_deck.add_card("card-2", quantity=4, category="mainboard")

    cloned = original_deck.fork(new_user_id="user-forker", new_name="My Cloned Elves")

    assert cloned.id != original_deck.id
    assert cloned.user_id == "user-forker"
    assert cloned.name == "My Cloned Elves"
    assert len(cloned.cards) == 2
    assert cloned.cards[0].scryfall_card_id == "card-1"
    assert cloned.cards[0].category == "commander"
    assert cloned.cards[1].scryfall_card_id == "card-2"
    assert cloned.cards[1].quantity == 4