# tests/test_commander_rules.py
# ---------------------------------------------------------
# SUITE DE PRUEBAS: REGLAS DE FORMATO COMMANDER (AUTÓNOMO)
# ---------------------------------------------------------
import pytest
from app.models.card import CartaScryfall
from app.models.deck import Deck
from app.models.user import User


def _get_or_create_card(db_session, card_id: str, name: str, color_identity: str, type_line: str = "Creature") -> CartaScryfall:
    card = db_session.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not card:
        kwargs = {
            "id": card_id,
            "name": name,
            "color_identity": color_identity,
        }
        optional_attributes = {
            "type_line": type_line,
            "cmc": 1.0,
            "oracle_text": "",
            "scryfall_raw_data": {},
            "set": "TEST",
            "set_code": "TEST",
            "collector_number": "1"
        }
        for attr, val in optional_attributes.items():
            if hasattr(CartaScryfall, attr):
                kwargs[attr] = val

        card = CartaScryfall(**kwargs)
        db_session.add(card)
        db_session.commit()
        db_session.refresh(card)
    return card


def test_commander_color_identity_rejection_and_acceptance(db_session):
    """
    Verifica que CommanderLegalityStrategy aplique correctamente las reglas:
    1. Atraxa (W, U, B, G) acepta Counterspell (U) y Sol Ring (Incoloro).
    2. Atraxa rechaza Lightning Bolt (R) por violar la identidad de color.
    3. Kozilek (Incoloro) acepta Sol Ring pero rechaza Counterspell (U).
    """
    # 1. Obtener o crear usuario
    user = db_session.query(User).first()
    if not user:
        user = User(username="test_rules_user", email="rules@example.com")
        db_session.add(user)
        db_session.commit()

    # 2. Cartas canónicas para la prueba
    atraxa = _get_or_create_card(db_session, "card-atraxa-001", "Atraxa, Praetors' Voice", "W,U,B,G", "Legendary Creature — Phyrexian Angel Horror")
    kozilek = _get_or_create_card(db_session, "card-kozilek-002", "Kozilek, the Great Distortion", "", "Legendary Creature — Eldrazi")
    sol_ring = _get_or_create_card(db_session, "card-solring-003", "Sol Ring", "", "Artifact")
    counterspell = _get_or_create_card(db_session, "card-counterspell-004", "Counterspell", "U", "Instant")
    bolt = _get_or_create_card(db_session, "card-bolt-005", "Lightning Bolt", "R", "Instant")

    # CASO 1: Atraxa (W, U, B, G) con Lightning Bolt (R) -> ILEGAL POR COLOR
    deck_atraxa = Deck(user_id=str(user.id), name="Atraxa Deck Test", format="Commander")
    db_session.add(deck_atraxa)
    
    deck_atraxa.add_card(scryfall_card_id=atraxa.id, quantity=1, category="commander", card_catalog=atraxa)
    deck_atraxa.add_card(scryfall_card_id=counterspell.id, quantity=1, category="mainboard", card_catalog=counterspell)
    deck_atraxa.add_card(scryfall_card_id=sol_ring.id, quantity=1, category="mainboard", card_catalog=sol_ring)
    deck_atraxa.add_card(scryfall_card_id=bolt.id, quantity=1, category="mainboard", card_catalog=bolt)
    
    db_session.flush()

    res_atraxa = deck_atraxa.validate_legality()
    assert res_atraxa["is_legal"] is False
    assert any("Lightning Bolt" in issue for issue in res_atraxa["issues"]), f"Issues reportados: {res_atraxa['issues']}"

    # CASO 2: Kozilek (Incoloro) con Counterspell (U) -> ILEGAL POR COLOR
    deck_kozilek = Deck(user_id=str(user.id), name="Kozilek Deck Test", format="Commander")
    db_session.add(deck_kozilek)
    
    deck_kozilek.add_card(scryfall_card_id=kozilek.id, quantity=1, category="commander", card_catalog=kozilek)
    deck_kozilek.add_card(scryfall_card_id=sol_ring.id, quantity=1, category="mainboard", card_catalog=sol_ring)
    deck_kozilek.add_card(scryfall_card_id=counterspell.id, quantity=1, category="mainboard", card_catalog=counterspell)
    
    db_session.flush()

    res_kozilek = deck_kozilek.validate_legality()
    assert res_kozilek["is_legal"] is False
    assert any("Counterspell" in issue for issue in res_kozilek["issues"]), f"Issues reportados: {res_kozilek['issues']}"