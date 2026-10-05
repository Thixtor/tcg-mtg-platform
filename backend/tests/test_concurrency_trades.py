# tests/test_concurrency_trades.py
# -----------------------------------------------------------------------------
# PRUEBA DE CONCURRENCIA Y BLOQUEO DE FILA (SELECT ... FOR UPDATE)
# -----------------------------------------------------------------------------
import pytest
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient

from app.models.user import User
from app.models.card import CartaScryfall
from app.models.collection import Collection, UserCard
from app.models.trade_proposal import TradeProposal, TradeProposalItem
from app.core.security import create_access_token


def _get_or_create_card(db_session, card_id: str, name: str) -> CartaScryfall:
    card = db_session.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not card:
        card = CartaScryfall(
            id=card_id,
            name=name,
            color_identity="W",
            type_line="Instant",
            cmc=1.0,
            scryfall_raw_data={}
        )
        db_session.add(card)
        db_session.commit()
        db_session.refresh(card)
    return card


def test_concurrent_trade_accept_prevents_double_acceptance(client: TestClient, db_session):
    # 1. Crear usuarios involucrados
    user_proposer = User(
        id="user-race-proposer-001",
        username="race_proposer",
        email="proposer@race.test",
        is_phone_verified=True,
        reputation_score=100
    )
    user_receiver = User(
        id="user-race-receiver-002",
        username="race_receiver",
        email="receiver@race.test",
        is_phone_verified=True,
        reputation_score=100
    )
    db_session.add_all([user_proposer, user_receiver])
    db_session.commit()

    # 2. Carpetas de colección
    col_proposer = Collection(
        id="col-folder-proposer-01",
        user_id=user_proposer.id,
        name="Proposer Binder"
    )
    col_receiver = Collection(
        id="col-folder-receiver-02",
        user_id=user_receiver.id,
        name="Receiver Binder"
    )
    db_session.add_all([col_proposer, col_receiver])
    db_session.commit()

    # 3. Cartas Scryfall e inventario individual (UserCard)
    card_a = _get_or_create_card(db_session, "race-card-001", "Swords to Plowshares")
    card_b = _get_or_create_card(db_session, "race-card-002", "Path to Exile")

    user_card_a = UserCard(
        id="ucard-race-001",
        collection_id=col_proposer.id,
        scryfall_card_id=card_a.id,
        quantity=2,
        condition="NM",
        is_for_trade=True
    )
    user_card_b = UserCard(
        id="ucard-race-002",
        collection_id=col_receiver.id,
        scryfall_card_id=card_b.id,
        quantity=2,
        condition="NM",
        is_for_trade=True
    )
    db_session.add_all([user_card_a, user_card_b])
    db_session.commit()

    # 4. Propuesta de intercambio en estado inicial 'proposed'
    proposal = TradeProposal(
        id="proposal-concurrency-uuid-001",
        proposer_id=user_proposer.id,
        receiver_id=user_receiver.id,
        status="proposed"
    )
    db_session.add(proposal)
    db_session.commit()

    item_send = TradeProposalItem(
        id="item-send-001",
        proposal_id=proposal.id,
        user_card_id=user_card_a.id,
        side="PROPOSER",
        quantity=1,
        agreed_price_usd=1.0
    )
    item_receive = TradeProposalItem(
        id="item-receive-002",
        proposal_id=proposal.id,
        user_card_id=user_card_b.id,
        side="RECEIVER",
        quantity=1,
        agreed_price_usd=1.0
    )
    db_session.add_all([item_send, item_receive])
    db_session.commit()

    # 5. Token de autenticación del receptor y endpoint
    receiver_token = create_access_token(user_id=user_receiver.id)
    headers = {"Authorization": f"Bearer {receiver_token}"}
    accept_endpoint = f"/api/trade/proposals/{proposal.id}/accept"

    def send_accept():
        return client.post(accept_endpoint, headers=headers)

    # 6. Lanzar peticiones concurrentes
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(send_accept)
        f2 = executor.submit(send_accept)

        res1 = f1.result()
        res2 = f2.result()

    status_codes = [res1.status_code, res2.status_code]

    # 7. Diagnóstico y aserciones de serialización
    assert 200 in status_codes, (
        f"Una petición debió procesarse exitosamente (200). Códigos recibidos: {status_codes}. "
        f"Body 1: {res1.text} | Body 2: {res2.text}"
    )
    assert any(code in [400, 409] for code in status_codes), (
        f"La concurrente debió ser rechazada (400/409). Códigos recibidos: {status_codes}. "
        f"Body rechazado: {res1.text if res1.status_code != 200 else res2.text}"
    )

    # 8. Estado persistido consistente en base de datos
    db_session.expire_all()
    final_proposal = db_session.query(TradeProposal).filter(TradeProposal.id == proposal.id).first()
    assert final_proposal.status == "accepted"