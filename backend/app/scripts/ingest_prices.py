# app/scripts/ingest_prices.py
# ---------------------------------------------------------
# SCRIPT ETL: INGESTA DE PRECIOS DIARIOS (MTGJSON -> POSTGRESQL)
# ---------------------------------------------------------
import io
import gzip
import json
import logging
import uuid
from datetime import date, datetime
from typing import List, Dict, Any, Optional

import requests
from sqlalchemy.dialects.postgresql import insert
from app.database import SessionLocal
from app.models import HistoricoPrecio, CartaScryfall

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger("ingest_prices")

MTGJSON_IDENTIFIERS_URL = "https://mtgjson.com/api/v5/AllIdentifiers.json.gz"
MTGJSON_PRICES_TODAY_URL = "https://mtgjson.com/api/v5/AllPricesToday.json.gz"
BATCH_SIZE = 5000

HEADERS = {
    "User-Agent": "MTGTradeMarketApp/1.0 (Price Ingestion Engine)"
}


def download_and_parse_gz(url: str, description: str) -> Dict[str, Any]:
    """Descarga y descomprime un archivo .json.gz de MTGJSON por chunks en memoria controlada."""
    logger.info(f"Descargando {description} desde {url}...")
    try:
        response = requests.get(url, headers=HEADERS, stream=True, timeout=120)
        response.raise_for_status()
        
        # Cargar stream gzip
        with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as gz:
            data = json.load(gz)
            return data.get("data", {})
    except Exception as e:
        logger.error(f"Error descargando o descomprimiendo {description}: {e}")
        raise


def get_latest_price_entry(price_dict: Dict[str, Any]) -> tuple[Optional[float], Optional[date]]:
    """
    Obtiene el precio más reciente y su fecha exacta (YYYY-MM-DD),
    evitando ordenar arbitrariamente o asumir hoy.
    """
    if not price_dict:
        return None, None

    # Las claves de MTGJSON son fechas en formato 'YYYY-MM-DD'
    sorted_dates = sorted(price_dict.keys())
    if not sorted_dates:
        return None, None

    latest_date_str = sorted_dates[-1]
    latest_val = price_dict[latest_date_str]

    if latest_val is None:
        return None, None

    try:
        real_date = datetime.strptime(latest_date_str, "%Y-%m-%d").date()
    except ValueError:
        real_date = date.today()

    return float(latest_val), real_date


def execute_batch_upsert(session, batch: List[Dict[str, Any]]) -> None:
    """
    Deduplica el lote en memoria por clave única para prevenir CardinalityViolation en PostgreSQL.
    """
    if not batch:
        return

    dedup: Dict[tuple, Dict[str, Any]] = {}
    for item in batch:
        clave = (item["scryfall_card_id"], item["tienda"], item["tipo"], item["fecha"])
        dedup[clave] = item

    unique_batch = list(dedup.values())

    stmt = insert(HistoricoPrecio).values(unique_batch)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_historico_carta_tienda_fecha",
        set_={"precio_usd": stmt.excluded.precio_usd}
    )
    session.execute(stmt)


def run_price_ingestion():
    session = SessionLocal()

    try:
        # 1. Cartas locales para no violar FK de scryfall_card_id
        logger.info("Consultando catálogo de cartas local en PostgreSQL...")
        scryfall_ids_locales = {
            str(row[0]) for row in session.query(CartaScryfall.id).all()
        }
        logger.info(f"Total de cartas en catálogo local: {len(scryfall_ids_locales)}")

        if not scryfall_ids_locales:
            logger.warning("No hay cartas cargadas en la base de datos. Abortando ingesta de precios.")
            return

        # 2. Descargar mapa de MTGJSON UUID -> Scryfall ID
        identifiers_data = download_and_parse_gz(MTGJSON_IDENTIFIERS_URL, "Identificadores MTGJSON")
        uuid_to_scryfall: Dict[str, str] = {}

        for mtg_uuid, card_info in identifiers_data.items():
            scryfall_id = card_info.get("identifiers", {}).get("scryfallId")
            if scryfall_id and scryfall_id in scryfall_ids_locales:
                uuid_to_scryfall[mtg_uuid] = scryfall_id

        logger.info(f"Cartas mapeadas coincidentes con catálogo local: {len(uuid_to_scryfall)}")
        del identifiers_data

        # 3. Descargar precios de hoy
        prices_data = download_and_parse_gz(MTGJSON_PRICES_TODAY_URL, "Precios del día (AllPricesToday)")

        lote_precios: List[Dict[str, Any]] = []
        total_ingresados = 0

        logger.info("Extrayendo precios con fechas reales de cotización...")

        for mtg_uuid, price_obj in prices_data.items():
            scryfall_id = uuid_to_scryfall.get(mtg_uuid)
            if not scryfall_id:
                continue

            paper_prices = price_obj.get("paper", {})

            # Proveedores y tipos a evaluar
            tiendas = [
                ("cardkingdom", paper_prices.get("cardkingdom", {}).get("retail", {})),
                ("tcgplayer", paper_prices.get("tcgplayer", {}).get("retail", {}))
            ]

            for tienda_nombre, tipos in tiendas:
                for tipo_nombre in ("normal", "foil"):
                    cotizaciones = tipos.get(tipo_nombre, {})
                    precio_val, fecha_real = get_latest_price_entry(cotizaciones)
                    
                    if precio_val is not None and fecha_real is not None:
                        lote_precios.append({
                            "id": str(uuid.uuid4()),
                            "scryfall_card_id": scryfall_id,
                            "tienda": tienda_nombre,
                            "tipo": tipo_nombre,
                            "precio_usd": precio_val,
                            "fecha": fecha_real
                        })

            if len(lote_precios) >= BATCH_SIZE:
                execute_batch_upsert(session, lote_precios)
                total_ingresados += len(lote_precios)
                lote_precios.clear()

        if lote_precios:
            execute_batch_upsert(session, lote_precios)
            total_ingresados += len(lote_precios)
            lote_precios.clear()

        session.commit()
        logger.info(f"Ingesta de precios completada. Total registros insertados/actualizados: {total_ingresados}")

    except Exception as e:
        session.rollback()
        logger.error(f"Error durante la sincronización de precios: {e}", exc_info=True)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_price_ingestion()