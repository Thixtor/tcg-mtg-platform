# tests/test_trade_feedback.py
# -----------------------------------------------------------------------------
# PRUEBAS DE CALIFICACIÓN Y REPUTACIÓN (TradeFeedback)
# -----------------------------------------------------------------------------
import pytest
from fastapi.testclient import TestClient

from app.models.user import User
from app.models.trade_proposal import TradeProposal, TradeFeedback
from app.core.security import create_access_token


@pytest.fixture
def trade_users(db_session):
    u1 = User(
        id="user-feedback-proposer-01",
        username="feedback_proposer",
        email="f_proposer@test.com",
        is_phone_verified=True,
        reputation_score=100,
        completed_trades=0,
        disputes_count=0
    )
    u2 = User(
        id="user-feedback-receiver-02",
        username="feedback_receiver",
        email="f_receiver@test.com",
        is_phone_verified=True,
        reputation_score=100,
        completed_trades=0,
        disputes_count=0
    )
    u3 = User(
        id="user-feedback-third-party-03",
        username="feedback_intruder",
        email="f_intruder@test.com",
        is_phone_verified=True,
        reputation_score=100
    )
    db_session.add_all([u1, u2, u3])
    db_session.commit()
    return u1, u2, u3


def test_submit_feedback_fails_if_not_completed(client: TestClient, db_session, trade_users):
    u1, u2, _ = trade_users

    # Propuesta en estado 'accepted' (aún no finalizada)
    proposal = TradeProposal(
        id="prop-fb-test-001",
        proposer_id=u1.id,
        receiver_id=u2.id,
        status="accepted"
    )
    db_session.add(proposal)
    db_session.commit()

    token = create_access_token(user_id=u1.id)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"rating": 5.0, "comment": "Todo perfecto", "successful": True}

    res = client.post(f"/api/trade/proposals/{proposal.id}/feedback", headers=headers, json=payload)
    assert res.status_code == 400
    assert "Solo puedes calificar intercambios que se encuentren en estado 'completed'" in res.text


def test_submit_feedback_forbidden_for_third_party(client: TestClient, db_session, trade_users):
    u1, u2, u3 = trade_users

    proposal = TradeProposal(
        id="prop-fb-test-002",
        proposer_id=u1.id,
        receiver_id=u2.id,
        status="completed"
    )
    db_session.add(proposal)
    db_session.commit()

    token_intruder = create_access_token(user_id=u3.id)
    headers = {"Authorization": f"Bearer {token_intruder}"}
    payload = {"rating": 5.0, "comment": "Intento no autorizado", "successful": True}

    res = client.post(f"/api/trade/proposals/{proposal.id}/feedback", headers=headers, json=payload)
    assert res.status_code == 403
    assert "No tienes permiso" in res.text


def test_submit_feedback_success_and_prevents_duplicate(client: TestClient, db_session, trade_users):
    u1, u2, _ = trade_users

    proposal = TradeProposal(
        id="prop-fb-test-003",
        proposer_id=u1.id,
        receiver_id=u2.id,
        status="completed"
    )
    db_session.add(proposal)
    db_session.commit()

    # 1. Proponente califica al receptor con éxito
    token_u1 = create_access_token(user_id=u1.id)
    headers_u1 = {"Authorization": f"Bearer {token_u1}"}
    payload = {
        "rating": 5.0,
        "comment": "Excelente trato y cartas en perfecto estado.",
        "successful": True
    }

    res = client.post(f"/api/trade/proposals/{proposal.id}/feedback", headers=headers_u1, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["target_user_id"] == u2.id
    assert data["target_username"] == u2.username

    # Verificar registro en base de datos
    db_session.expire_all()
    fb = db_session.query(TradeFeedback).filter(
        TradeFeedback.proposal_id == proposal.id,
        TradeFeedback.author_id == u1.id
    ).first()
    assert fb is not None
    assert fb.target_user_id == u2.id
    assert fb.rating == 5.0

    # 2. Intento duplicado por el mismo autor en la misma propuesta
    res_dup = client.post(f"/api/trade/proposals/{proposal.id}/feedback", headers=headers_u1, json=payload)
    assert res_dup.status_code == 400
    assert "Ya has enviado tu calificación" in res_dup.text

    # 3. La contraparte (u2) sí puede calificar a u1
    token_u2 = create_access_token(user_id=u2.id)
    headers_u2 = {"Authorization": f"Bearer {token_u2}"}
    payload_u2 = {
        "rating": 4.5,
        "comment": "Todo bien, envío rápido.",
        "successful": True
    }
    res_u2 = client.post(f"/api/trade/proposals/{proposal.id}/feedback", headers=headers_u2, json=payload_u2)
    assert res_u2.status_code == 200
    assert res_u2.json()["target_user_id"] == u1.id