# app/scripts/ingest_prices.py
# ---------------------------------------------------------
# SCRIPT ETL (MVP): INGESTA DIRECTA CARD KINGDOM -> POSTGRESQL
# ---------------------------------------------------------
import uuid
import logging
import requests
from decimal import Decimal
from datetime import date
from typing import List, Dict, Any

from sqlalchemy.dialects.postgresql import insert
from app.database import SessionLocal
from app.models.price import HistoricoPrecio
from app.models.card import CartaScryfall

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger("ingest_prices")

CK_PRICELIST_URL = "https://api.cardkingdom.com/api/v2/pricelist"
BATCH_SIZE = 5000

HEADERS = {
    "User-Agent": "MTGTradeApp/1.0 (Price Ingestion Engine)"
}


def run_price_ingestion():
    session = SessionLocal()
    today = date.today()

    try:
        logger.info("Obteniendo catálogo local de Scryfall IDs...")
        local_ids = {str(row[0]) for row in session.query(CartaScryfall.id).all()}
        logger.info(f"Total de cartas en catálogo local: {len(local_ids)}")

        if not local_ids:
            logger.warning("No hay cartas registradas en el catálogo. Abortando ingesta.")
            return

        logger.info(f"Descargando lista oficial de precios desde {CK_PRICELIST_URL}...")
        response = requests.get(CK_PRICELIST_URL, headers=HEADERS, timeout=120)
        response.raise_for_status()

        payload = response.json()
        products = payload.get("data", [])
        logger.info(f"Total productos recibidos de Card Kingdom: {len(products)}")

        batch: List[Dict[str, Any]] = []
        total_ingresados = 0

        for p in products:
            scryfall_id = p.get("scryfall_id")
            if not scryfall_id or scryfall_id not in local_ids:
                continue

            price_retail = p.get("price_retail")
            if price_retail is not None:
                try:
                    price_dec = Decimal(str(price_retail))
                except Exception:
                    continue

                is_foil = str(p.get("is_foil", "false")).lower() == "true"
                tipo = "foil" if is_foil else "normal"

                batch.append({
                    "id": str(uuid.uuid4()),
                    "scryfall_card_id": scryfall_id,
                    "tienda": "cardkingdom",
                    "tipo": tipo,
                    "precio_usd": price_dec,
                    "fecha": today
                })

            if len(batch) >= BATCH_SIZE:
                _execute_upsert(session, batch)
                total_ingresados += len(batch)
                batch.clear()

        if batch:
            _execute_upsert(session, batch)
            total_ingresados += len(batch)
            batch.clear()

        session.commit()
        logger.info(f"Sincronización finalizada exitosamente. Total registros procesados: {total_ingresados}")

    except Exception as e:
        session.rollback()
        logger.error(f"Error durante la sincronización de precios: {e}", exc_info=True)
        raise
    finally:
        session.close()


def _execute_upsert(session, batch: List[Dict[str, Any]]) -> None:
    # Deduplicar en memoria por restricción de unicidad antes del upsert
    dedup: Dict[tuple, Dict[str, Any]] = {}
    for item in batch:
        key = (item["scryfall_card_id"], item["tienda"], item["tipo"], item["fecha"])
        dedup[key] = item

    unique_batch = list(dedup.values())
    stmt = insert(HistoricoPrecio).values(unique_batch)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_historico_carta_tienda_fecha",
        set_={"precio_usd": stmt.excluded.precio_usd}
    )
    session.execute(stmt)


if __name__ == "__main__":
    run_price_ingestion()