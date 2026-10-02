import pytest
from app.models.collection import Collection, UserCard, CardCondition, CardLanguage


def test_collection_aggregate_add_card_distinct_instances():
    col = Collection(id="col-1", user_id="user-1", name="Main Binder")

    # Mismo Scryfall ID pero diferente condición -> Son dos instancias físicas separadas
    card_nm = col.add_card("card-lotus", quantity=1, condition="NM", language="en", is_foil=False)
    card_lp = col.add_card("card-lotus", quantity=1, condition="LP", language="en", is_foil=False)

    assert len(col.cards) == 2
    assert card_nm.id != card_lp.id
    assert col.total_cards_count == 2


def test_collection_aggregate_add_card_merges_identical_instances():
    col = Collection(id="col-2", user_id="user-1", name="Foils Binder")

    col.add_card("card-solring", quantity=1, condition="NM", language="en", is_foil=True)
    # Misma variante física exacta: incrementa la cantidad
    col.add_card("card-solring", quantity=2, condition="NM", language="en", is_foil=True)

    assert len(col.cards) == 1
    assert col.cards[0].quantity == 3
    assert col.total_cards_count == 3


def test_collection_trade_metrics_and_status():
    col = Collection(id="col-3", user_id="user-1", name="Trade Binder")

    col.add_card("card-a", quantity=2, is_for_trade=True)
    col.add_card("card-b", quantity=3, is_for_trade=False)

    assert col.total_cards_count == 5
    assert col.trade_cards_count == 2

    # Cambiar estado de trade en la entidad interna
    user_card_b = col.cards[1]
    user_card_b.set_trade_status(is_for_trade=True, trade_notes="Solo cambios por fetchlands")
    assert col.trade_cards_count == 5
    assert user_card_b.trade_notes == "Solo cambios por fetchlands"


def test_collection_invalid_mutations():
    col = Collection(id="col-4", user_id="user-1", name="Errors Binder")

    with pytest.raises(ValueError, match="superior a 0"):
        col.add_card("card-x", quantity=0)

    card = col.add_card("card-y", quantity=1)
    with pytest.raises(ValueError, match="mayor a cero"):
        card.change_quantity(-1)

    with pytest.raises(ValueError, match="Condición inválida"):
        card.set_condition("MINT_IMMACULATE")