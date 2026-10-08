# app/scripts/ingest_prices.py
# ---------------------------------------------------------
# SCRIPT ETL: INGESTA DIRECTA CARD KINGDOM -> POSTGRESQL
# OPTIMIZADO PARA CATÁLOGO CANÓNICO (ORACLE_CARDS) Y NULLPOOL
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
from app.models.card import CartaScryfall

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger("ingest_prices")

CK_PRICELIST_URL = "https://api.cardkingdom.com/api/v2/pricelist"
BATCH_SIZE = 2000

HEADERS = {
    "User-Agent": "MTGTradeApp/1.0 (Price Ingestion Engine)"
}

# Motor dedicado para ETL con NullPool (resuelve corte de sockets TCP e3q8)
etl_engine = create_engine(
    db_url,
    poolclass=NullPool,
    connect_args=connect_args
)


def ensure_prices_schema() -> None:
    """Verifica y asegura la existencia de la tabla e índices del histórico de precios."""
    logger.info("Comprobando y asegurando el esquema de histórico de precios...")
    HistoricoPrecio.__table__.create(bind=etl_engine, checkfirst=True)


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
    ensure_prices_schema()
    today = date.today()

    logger.info("Cargando mapa canónico del catálogo local (ID y Nombre)...")
    # Mapeo dual: por UUID directo y por nombre en minúsculas (para asociar variantes de CK)
    with etl_engine.connect() as conn:
        rows = conn.execute(text("SELECT id, lower(name) FROM cartas;")).fetchall()
    
    local_id_set = {str(r[0]) for r in rows}
    name_to_id = {str(r[1]): str(r[0]) for r in rows}
    logger.info(f"Catálogo cargado: {len(local_id_set)} cartas únicas disponibles.")

    if not local_id_set:
        logger.warning("No hay cartas registradas en el catálogo. Aborta la ingesta.")
        return

    # Descarga HTTP desacoplada de la base de datos (evita timeout de proxy TCP)
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

        # Resuelve el ID canónico: primero por Scryfall ID exacto, luego por nombre canónico
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

        # Mantiene la cotización de referencia (conservando el valor más competitivo si hay varias versiones)
        if is_foil:
            if retail_dec and (cards_pricing_map[canonical_id]["foil"] is None or retail_dec < cards_pricing_map[canonical_id]["foil"]):
                cards_pricing_map[canonical_id]["foil"] = retail_dec
        else:
            if retail_dec and (cards_pricing_map[canonical_id]["retail"] is None or retail_dec < cards_pricing_map[canonical_id]["retail"]):
                cards_pricing_map[canonical_id]["retail"] = retail_dec
            if buy_dec and (cards_pricing_map[canonical_id]["buylist"] is None or buy_dec > cards_pricing_map[canonical_id]["buylist"]):
                cards_pricing_map[canonical_id]["buylist"] = buy_dec

        # Registro para el Histórico
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

    # Actualizar cotizaciones de acceso directo en la tabla 'cartas'
    logger.info("Actualizando cotizaciones directas en la tabla 'cartas'...")
    update_count = 0
    update_batch = []

    for cid, vals in cards_pricing_map.items():
        update_batch.append({
            "b_id": str(cid),
            "b_retail": vals["retail"],
            "b_buylist": vals["buylist"],
            "b_foil": vals["foil"]
        })
        if len(update_batch) >= 1000:
            _batch_update_cartas_atomic(update_batch)
            update_count += len(update_batch)
            update_batch.clear()

    if update_batch:
        _batch_update_cartas_atomic(update_batch)
        update_count += len(update_batch)
        update_batch.clear()

    logger.info(f"Proceso finalizado. Cartas actualizadas con precios: {update_count}")


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


def _batch_update_cartas_atomic(batch: List[Dict[str, Any]]) -> None:
    """Actualiza en bloque cartas usando CAST() estándar compatible con PostgreSQL."""
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
    with etl_engine.begin() as conn:
        conn.execute(sql, batch)


if __name__ == "__main__":
    run_price_ingestion()