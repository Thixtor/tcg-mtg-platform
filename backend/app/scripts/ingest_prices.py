# app/scripts/ingest_prices.py
# ---------------------------------------------------------
# SCRIPT ETL: INGESTA DIRECTA CARD KINGDOM -> POSTGRESQL
# OPTIMIZADO CON TABLA TEMPORAL (UPDATE INSTANTÁNEO EN UN ÚNICO QUERY)
# ---------------------------------------------------------
import uuid
import logging
import requests
from decimal import Decimal
from datetime import date
from typing import List, Dict, Any, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sqlalchemy.dialects.postgresql import insert

from app.database import db_url, connect_args
from app.models.price import HistoricoPrecio

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

etl_engine = create_engine(
    db_url,
    poolclass=NullPool,
    connect_args=connect_args
)


def ensure_prices_schema() -> None:
    """Asegura la existencia de la tabla e índices del histórico de precios."""
    logger.info("Comprobando y asegurando el esquema de histórico de precios...")
    HistoricoPrecio.__table__.create(bind=etl_engine, checkfirst=True)


def _parse_decimal(val: Any) -> Optional[Decimal]:
    """Convierte de forma segura un valor a Decimal."""
    if val is None or val == "":
        return None
    try:
        parsed = Decimal(str(val))
        return parsed if parsed > 0 else None
    except Exception:
        return None


def run_price_ingestion():
    ensure_prices_schema()
    today = date.today()

    logger.info("Cargando mapa canónico del catálogo local (ID y Nombre)...")
    with etl_engine.connect() as conn:
        rows = conn.execute(text("SELECT id, lower(name) FROM cartas;")).fetchall()
    
    local_id_set = {str(r[0]) for r in rows}
    name_to_id = {str(r[1]): str(r[0]) for r in rows}
    logger.info(f"Catálogo cargado: {len(local_id_set)} cartas únicas disponibles.")

    if not local_id_set:
        logger.warning("No hay cartas registradas en el catálogo. Abortando ingesta.")
        return

    logger.info(f"Descargando feed de precios desde {CK_PRICELIST_URL}...")
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
        card_name = str(p.get("name", "")).strip().lower()

        canonical_id = None
        if scryfall_id and scryfall_id in local_id_set:
            canonical_id = scryfall_id
        elif card_name in name_to_id:
            canonical_id = name_to_id[card_name]

        if not canonical_id:
            continue

        retail_dec = _parse_decimal(p.get("price_retail"))
        buy_dec = _parse_decimal(p.get("price_buy"))
        is_foil = str(p.get("is_foil", "false")).lower() == "true"
        tipo = "foil" if is_foil else "normal"

        if canonical_id not in cards_pricing_map:
            cards_pricing_map[canonical_id] = {
                "retail": None,
                "buylist": None,
                "foil": None
            }

        if is_foil:
            if retail_dec and (cards_pricing_map[canonical_id]["foil"] is None or retail_dec < cards_pricing_map[canonical_id]["foil"]):
                cards_pricing_map[canonical_id]["foil"] = retail_dec
        else:
            if retail_dec and (cards_pricing_map[canonical_id]["retail"] is None or retail_dec < cards_pricing_map[canonical_id]["retail"]):
                cards_pricing_map[canonical_id]["retail"] = retail_dec
            if buy_dec and (cards_pricing_map[canonical_id]["buylist"] is None or buy_dec > cards_pricing_map[canonical_id]["buylist"]):
                cards_pricing_map[canonical_id]["buylist"] = buy_dec

        # Histórico
        if retail_dec is not None:
            history_batch.append({
                "id": str(uuid.uuid4()),
                "scryfall_card_id": canonical_id,
                "tienda": "cardkingdom",
                "tipo": tipo,
                "precio_usd": retail_dec,
                "fecha": today
            })

        if buy_dec is not None and not is_foil:
            history_batch.append({
                "id": str(uuid.uuid4()),
                "scryfall_card_id": canonical_id,
                "tienda": "cardkingdom_buylist",
                "tipo": tipo,
                "precio_usd": buy_dec,
                "fecha": today
            })

        if len(history_batch) >= BATCH_SIZE:
            _execute_upsert_atomic(history_batch)
            total_history_ingresados += len(history_batch)
            history_batch.clear()

    if history_batch:
        _execute_upsert_atomic(history_batch)
        total_history_ingresados += len(history_batch)
        history_batch.clear()

    logger.info(f"Histórico actualizado. Total cotizaciones procesadas: {total_history_ingresados}")

    # ACTUALIZACIÓN EN UN SOLO PASO VÍA TABLA TEMPORAL
    logger.info("Actualizando cotizaciones directas en la tabla 'cartas' mediante tabla temporal...")
    _bulk_update_cartas_fast(cards_pricing_map)
    logger.info("Proceso de ingesta de precios completado exitosamente.")


def _execute_upsert_atomic(batch: List[Dict[str, Any]]) -> None:
    """Inserta histórico en bloque con transacción atómica vía NullPool."""
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
    with etl_engine.begin() as conn:
        conn.execute(stmt)


def _bulk_update_cartas_fast(pricing_map: Dict[str, Dict[str, Optional[Decimal]]]) -> None:
    """
    Carga los precios en una tabla temporal unlogged y ejecuta un único UPDATE relacional.
    Tarda ~2-3 segundos en PostgreSQL.
    """
    if not pricing_map:
        return

    update_records = [
        {
            "card_id": cid,
            "retail": vals["retail"],
            "buylist": vals["buylist"],
            "foil": vals["foil"]
        }
        for cid, vals in pricing_map.items()
    ]

    with etl_engine.begin() as conn:
        # 1. Crear tabla temporal ultraligera
        conn.execute(text("""
            CREATE TEMP TABLE tmp_ck_precios (
                card_id VARCHAR PRIMARY KEY,
                retail NUMERIC(10, 2),
                buylist NUMERIC(10, 2),
                foil NUMERIC(10, 2)
            ) ON COMMIT DROP;
        """))

        # 2. Carga masiva en bloque a la tabla temporal
        insert_tmp_sql = text("""
            INSERT INTO tmp_ck_precios (card_id, retail, buylist, foil)
            VALUES (:card_id, :retail, :buylist, :foil);
        """)
        conn.execute(insert_tmp_sql, update_records)

        # 3. Un solo UPDATE relacional a nivel de motor Postgres
        update_result = conn.execute(text("""
            UPDATE cartas AS c
            SET 
                cardkingdom_price_retail = COALESCE(t.retail, c.cardkingdom_price_retail),
                cardkingdom_price_buylist = COALESCE(t.buylist, c.cardkingdom_price_buylist),
                cardkingdom_price_foil = COALESCE(t.foil, c.cardkingdom_price_foil)
            FROM tmp_ck_precios AS t
            WHERE c.id = t.card_id;
        """))
        logger.info(f"Filas actualizadas en 'cartas' en una sola operación: {update_result.rowcount}")


if __name__ == "__main__":
    run_price_ingestion()