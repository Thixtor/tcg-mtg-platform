# app/scripts/ingest_prices.py
# ---------------------------------------------------------
# SCRIPT ETL: INGESTA DIRECTA CARD KINGDOM -> POSTGRESQL
# ---------------------------------------------------------
import uuid
import logging
import requests
from decimal import Decimal
from datetime import date
from typing import List, Dict, Any, Optional

from sqlalchemy import text
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


def _parse_decimal(val: Any) -> Optional[Decimal]:
    """Convierte de forma segura un valor numérico/cadena a Decimal."""
    if val is None or val == "":
        return None
    try:
        parsed = Decimal(str(val))
        return parsed if parsed > 0 else None
    except Exception:
        return None


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

        history_batch: List[Dict[str, Any]] = []
        cards_pricing_map: Dict[str, Dict[str, Optional[Decimal]]] = {}
        total_history_ingresados = 0

        for p in products:
            scryfall_id = p.get("scryfall_id")
            if not scryfall_id or scryfall_id not in local_ids:
                continue

            retail_dec = _parse_decimal(p.get("price_retail"))
            buy_dec = _parse_decimal(p.get("price_buy"))
            is_foil = str(p.get("is_foil", "false")).lower() == "true"
            tipo = "foil" if is_foil else "normal"

            if scryfall_id not in cards_pricing_map:
                cards_pricing_map[scryfall_id] = {
                    "retail": None,
                    "buylist": None,
                    "foil": None
                }

            if is_foil:
                if retail_dec:
                    cards_pricing_map[scryfall_id]["foil"] = retail_dec
            else:
                if retail_dec:
                    cards_pricing_map[scryfall_id]["retail"] = retail_dec
                if buy_dec:
                    cards_pricing_map[scryfall_id]["buylist"] = buy_dec

            # 1. Histórico Retail
            if retail_dec is not None:
                history_batch.append({
                    "id": str(uuid.uuid4()),
                    "scryfall_card_id": scryfall_id,
                    "tienda": "cardkingdom",
                    "tipo": tipo,
                    "precio_usd": retail_dec,
                    "fecha": today
                })

            # 2. Histórico Buylist
            if buy_dec is not None and not is_foil:
                history_batch.append({
                    "id": str(uuid.uuid4()),
                    "scryfall_card_id": scryfall_id,
                    "tienda": "cardkingdom_buylist",
                    "tipo": tipo,
                    "precio_usd": buy_dec,
                    "fecha": today
                })

            if len(history_batch) >= BATCH_SIZE:
                _execute_upsert(session, history_batch)
                total_history_ingresados += len(history_batch)
                history_batch.clear()

        if history_batch:
            _execute_upsert(session, history_batch)
            total_history_ingresados += len(history_batch)
            history_batch.clear()

        session.commit()
        logger.info(f"Histórico actualizado. Total cotizaciones procesadas: {total_history_ingresados}")

        # 3. Actualizar directamente la tabla 'cartas' con CAST ANSI-SQL
        logger.info("Actualizando precios de Card Kingdom en la tabla 'cartas'...")
        update_count = 0
        update_batch = []

        for cid, vals in cards_pricing_map.items():
            update_batch.append({
                "b_id": str(cid),
                "b_retail": vals["retail"],
                "b_buylist": vals["buylist"],
                "b_foil": vals["foil"]
            })
            if len(update_batch) >= 2000:
                _batch_update_cartas(session, update_batch)
                update_count += len(update_batch)
                update_batch.clear()

        if update_batch:
            _batch_update_cartas(session, update_batch)
            update_count += len(update_batch)
            update_batch.clear()

        session.commit()
        logger.info(f"Cartas actualizadas con precios directos de Card Kingdom: {update_count}")

    except Exception as e:
        session.rollback()
        logger.error(f"Error durante la sincronización de precios: {e}", exc_info=True)
        raise
    finally:
        session.close()


def _execute_upsert(session, batch: List[Dict[str, Any]]) -> None:
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


def _batch_update_cartas(session, batch: List[Dict[str, Any]]) -> None:
    """Actualiza en bloque cartas usando CAST() estándar compatible con SQLAlchemy y Postgres."""
    sql = text("""
        UPDATE cartas AS c
        SET 
            cardkingdom_price_retail = COALESCE(v.b_retail, c.cardkingdom_price_retail),
            cardkingdom_price_buylist = COALESCE(v.b_buylist, c.cardkingdom_price_buylist),
            cardkingdom_price_foil = COALESCE(v.b_foil, c.cardkingdom_price_foil)
        FROM (VALUES 
            (CAST(:b_id AS text), CAST(:b_retail AS numeric), CAST(:b_buylist AS numeric), CAST(:b_foil AS numeric))
        ) AS v(b_id, b_retail, b_buylist, b_foil)
        WHERE c.id = v.b_id;
    """)
    session.execute(sql, batch)


if __name__ == "__main__":
    run_price_ingestion()