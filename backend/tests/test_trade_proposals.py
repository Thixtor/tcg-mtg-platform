# tests/test_trade_proposals.py
# ---------------------------------------------------------
# PRUEBAS DE INTEGRACIÓN: PROPUESTAS DE TRADE Y REPUTACIÓN
# ---------------------------------------------------------
import pytest
from app.models.card import CartaScryfall
from app.models.collection import Collection, UserCard
from app.models.user import User
from app.models.trade_proposal import TradeStatus
from app.core.security import create_access_token
from app.core.config import settings


def _create_card(db_session, card_id: str, name: str) -> CartaScryfall:
    card = db_session.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not card:
        kwargs = {
            "id": card_id,
            "name": name,
            "color_identity": "U",
            "type_line": "Instant",
            "cmc": 1.0,
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


def test_trade_proposal_lifecycle_and_reputation(client, db_session):
    # 1. Crear usuarios Proposer y Receiver
    proposer = User(username="trader_alice", email="alice@trade.com", reputation_score=100, completed_trades=0, rating=5.0)
    receiver = User(username="trader_bob", email="bob@trade.com", reputation_score=100, completed_trades=0, rating=5.0)
    db_session.add_all([proposer, receiver])
    db_session.commit()

    # 2. Crear colecciones (Bob con binder público para trade)
    col_alice = Collection(user_id=str(proposer.id), name="Binder Alice", is_public_trade=True)
    col_bob = Collection(user_id=str(receiver.id), name="Binder Bob", is_public_trade=True)
    db_session.add_all([col_alice, col_bob])
    db_session.commit()

    card_a = _create_card(db_session, "trade-c-01", "Force of Will")
    card_b = _create_card(db_session, "trade-c-02", "Mana Drain")

    uc_alice = UserCard(collection_id=col_alice.id, scryfall_card_id=card_a.id, quantity=1, is_for_trade=True)
    uc_bob = UserCard(collection_id=col_bob.id, scryfall_card_id=card_b.id, quantity=1, is_for_trade=True)
    db_session.add_all([uc_alice, uc_bob])
    db_session.commit()

    # Headers de autenticación
    headers_alice = {"Authorization": f"Bearer {create_access_token(user_id=str(proposer.id))}"}
    headers_bob = {"Authorization": f"Bearer {create_access_token(user_id=str(receiver.id))}"}

    base_endpoint = f"{settings.API_V1_STR}/trade/proposals"

    # Test 1: Alice propone el intercambio a Bob
    proposal_payload = {
        "receiver_id": str(receiver.id),
        "items": [
            {"user_card_id": str(uc_alice.id), "side": "offered", "quantity": 1},
            {"user_card_id": str(uc_bob.id), "side": "requested", "quantity": 1}
        ],
        "cash_amount": 0.0,
        "notes": "Cambio directo de staples de control"
    }

    res_create = client.post(base_endpoint, json=proposal_payload, headers=headers_alice)
    assert res_create.status_code == 201
    prop_data = res_create.json()
    proposal_id = prop_data["id"]
    assert prop_data["status"] == TradeStatus.PROPOSED.value

    # Test 2: Bob acepta la propuesta
    res_accept = client.post(f"{base_endpoint}/{proposal_id}/accept", headers=headers_bob)
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == TradeStatus.ACCEPTED.value

    # Test 3: Marcar trade como completado
    res_complete = client.post(f"{base_endpoint}/{proposal_id}/complete", headers=headers_bob)
    assert res_complete.status_code == 200
    assert res_complete.json()["status"] == TradeStatus.COMPLETED.value

    # Verificar transferencia de inventario sin choque de FK RESTRICT
    db_session.refresh(uc_alice)
    db_session.refresh(uc_bob)
    assert uc_alice.quantity == 0
    assert uc_alice.is_for_trade is False
    assert uc_bob.quantity == 0
    assert uc_bob.is_for_trade is False

    # Verificar incremento de completed_trades y reputación según register_successful_trade (+2)
    db_session.refresh(proposer)
    db_session.refresh(receiver)
    assert proposer.completed_trades == 1
    assert proposer.reputation_score == 102
    assert receiver.completed_trades == 1
    assert receiver.reputation_score == 102

    # Test 4: Alice califica a Bob con 5 estrellas (Bono: 5.0 * 2 = +10 extra -> 112)
    feedback_payload = {
        "rating": 5.0,
        "comment": "Excelente trade, cartas en perfecto estado NM.",
        "successful": True
    }
    res_feedback = client.post(f"{base_endpoint}/{proposal_id}/feedback", json=feedback_payload, headers=headers_alice)
    assert res_feedback.status_code == 200
    fb_data = res_feedback.json()
    assert fb_data["target_user_id"] == str(receiver.id)
    assert fb_data["reputation_score"] == 112
    assert fb_data["rating"] == 5.0

    # Test 5: Alice intenta calificar de nuevo -> Debe fallar por UniqueConstraint
    res_duplicate = client.post(f"{base_endpoint}/{proposal_id}/feedback", json=feedback_payload, headers=headers_alice)
    assert res_duplicate.status_code == 400