import pytest
from datetime import date, timedelta
from fastapi import status
from app.models.card import CartaScryfall
from app.models.price import HistoricoPrecio
from app.services.price_service import PriceAnalyticsService


def test_historico_precio_validation_and_factory():
    # Creación exitosa
    item = HistoricoPrecio.record_price(
        scryfall_card_id="card-price-1",
        tienda="cardkingdom",
        precio_usd=12.50,
        tipo="normal"
    )
    assert item.precio_usd == 12.50
    assert item.tienda == "cardkingdom"

    # Rechazo ante precio negativo
    with pytest.raises(ValueError, match="no puede ser negativo"):
        HistoricoPrecio.record_price(
            scryfall_card_id="card-price-1",
            tienda="cardkingdom",
            precio_usd=-1.0
        )

    # Rechazo ante tienda desconocida
    with pytest.raises(ValueError, match="Tienda no soportada"):
        HistoricoPrecio.record_price(
            scryfall_card_id="card-price-1",
            tienda="tienda_falsa",
            precio_usd=5.0
        )


def test_price_endpoints_integration(client, db_session):
    # 1. Crear carta en catálogo
    card = CartaScryfall(
        id="card-lotus-prices",
        name="Black Lotus",
        set="vma",
        type_line="Artifact",
        mana_cost="{0}",
        cmc=0.0,
        rarity="mythic",
        colors="C",
        scryfall_raw_data={"id": "card-lotus-prices", "name": "Black Lotus"}
    )
    db_session.add(card)

    # 2. Agregar puntos de histórico cronológico
    p1 = HistoricoPrecio.record_price("card-lotus-prices", "cardkingdom", 5000.0, "normal", date.today() - timedelta(days=20))
    p2 = HistoricoPrecio.record_price("card-lotus-prices", "cardkingdom", 5500.0, "normal", date.today())
    p3 = HistoricoPrecio.record_price("card-lotus-prices", "tcgplayer", 5400.0, "normal", date.today())

    db_session.add_all([p1, p2, p3])
    db_session.commit()

    # 3. Probar GET /api/cards/{id}/prices/current
    url_current = f"/api/cards/{card.id}/prices/current"
    res_current = client.get(url_current)
    if res_current.status_code == status.HTTP_404_NOT_FOUND:
        url_current = f"/cards/{card.id}/prices/current"
        res_current = client.get(url_current)

    assert res_current.status_code == status.HTTP_200_OK
    data_curr = res_current.json()
    assert data_curr["cardkingdom_usd"] == 5500.0
    assert data_curr["tcgplayer_usd"] == 5400.0
    assert data_curr["cardkingdom_foil_usd"] is None

    # 4. Probar GET /api/cards/{id}/prices/history
    url_history = f"/api/cards/{card.id}/prices/history?tienda=cardkingdom&tipo=normal&days=30"
    res_history = client.get(url_history)
    if res_history.status_code == status.HTTP_404_NOT_FOUND:
        url_history = f"/cards/{card.id}/prices/history?tienda=cardkingdom&tipo=normal&days=30"
        res_history = client.get(url_history)

    assert res_history.status_code == status.HTTP_200_OK
    data_hist = res_history.json()
    assert len(data_hist["puntos"]) == 2
    assert data_hist["puntos"][0]["precio_usd"] == 5000.0
    assert data_hist["puntos"][1]["precio_usd"] == 5500.0