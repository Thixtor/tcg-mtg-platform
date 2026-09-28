from unittest.mock import MagicMock
from app.services.matchmaking_service import find_trade_matches_for_user


def test_matchmaking_empty_wishlist():
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = []

    res = find_trade_matches_for_user(db, "user-solicitante")
    assert res == []


def test_matchmaking_mutual_match():
    db = MagicMock()

    # 1. Wishlist del usuario solicitante: busca 'card-A'
    query_wishlist = MagicMock()
    query_wishlist.filter.return_value.all.return_value = [("card-A",)]

    # 2. Cartas para trade del usuario solicitante: ofrece 'card-B'
    query_user_trade = MagicMock()
    query_user_trade.join.return_value.filter.return_value.all.return_value = [("card-B",)]

    # 3. Contraparte que ofrece 'card-A'
    otro_user = MagicMock()
    otro_user.id = "user-contraparte"
    otro_user.username = "TraderPro"
    otro_user.reputation_score = 95

    cat_card_a = MagicMock()
    cat_card_a.name = "Sol Ring"
    cat_card_a.image_url = "http://img.png"

    user_card = MagicMock()
    user_card.scryfall_card_id = "card-A"
    user_card.condition = "NM"
    user_card.is_foil = True
    user_card.card_catalog = cat_card_a

    query_otros = MagicMock()
    query_otros.join.return_value.join.return_value.options.return_value.filter.return_value.all.return_value = [
        (user_card, otro_user)
    ]

    # 4. Lo que la contraparte busca (coincide con 'card-B')
    cat_card_b = MagicMock()
    cat_card_b.name = "Mana Vault"
    cat_card_b.image_url = "http://img2.png"

    wl_item = MagicMock()
    wl_item.scryfall_card_id = "card-B"
    wl_item.card_catalog = cat_card_b

    query_they_want = MagicMock()
    query_they_want.options.return_value.filter.return_value.all.return_value = [wl_item]

    db.query.side_effect = [
        query_wishlist,
        query_user_trade,
        query_otros,
        query_they_want,
    ]

    results = find_trade_matches_for_user(db, "user-solicitante")

    assert len(results) == 1
    match = results[0]
    assert match.user_id == "user-contraparte"
    assert match.username == "TraderPro"
    assert match.is_mutual_match is True
    assert len(match.they_have) == 1
    assert len(match.they_want) == 1
    assert match.they_have[0].card_name == "Sol Ring"
    assert match.they_want[0].card_name == "Mana Vault"
    assert not hasattr(match, "phone_number")