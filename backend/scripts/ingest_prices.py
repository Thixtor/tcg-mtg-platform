# ---------------------------------------------------------
# SCRIPT REFINADO: INGESTA DE PRECIOS DIARIOS (MTGJSON -> POSTGRESQL)
# ---------------------------------------------------------
import io
import gzip
import json
import logging
import uuid
from datetime import date
from typing import List, Dict, Any

import requests
from sqlalchemy.dialects.postgresql import insert
from app.database import SessionLocal
from app.models import HistoricoPrecio, CartaScryfall

# ---------------------------------------------------------
# CONFIGURACIÓN DE LOGS Y FUENTES EXTERNAS
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger(__name__)

# URLs de MTGJSON v5
MTGJSON_IDENTIFIERS_URL = "https://mtgjson.com/api/v5/AllIdentifiers.json.gz"
MTGJSON_PRICES_TODAY_URL = "https://mtgjson.com/api/v5/AllPricesToday.json.gz"
BATCH_SIZE = 5000

HEADERS = {
    "User-Agent": "MTGTradeMarketApp/1.0 (Price Ingestion Engine)"
}


def download_and_parse_gz(url: str, description: str) -> Dict[str, Any]:
    """Descarga y descomprime un archivo .json.gz de MTGJSON en memoria."""
    logger.info(f"Descargando {description} desde {url}...")
    try:
        response = requests.get(url, headers=HEADERS, stream=True, timeout=90)
        response.raise_for_status()
        with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as gz:
            return json.load(gz).get("data", {})
    except Exception as e:
        logger.error(f"Error descargando o descomprimiendo {description}: {e}")
        raise


def execute_batch_upsert(session, batch: List[Dict[str, Any]]) -> None:
    """
    Deduplica el lote en memoria antes de enviarlo a PostgreSQL para evitar
    el error CardinalityViolation ('cannot affect row a second time')
    y aplica el UPSERT sobre la restricción única existente.
    """
    if not batch:
        return

    # Deduplicar por clave de negocio: (scryfall_card_id, tienda, tipo, fecha)
    dedup: Dict[tuple, Dict[str, Any]] = {}
    for item in batch:
        clave = (item["scryfall_card_id"], item["tienda"], item["tipo"], item["fecha"])
        dedup[clave] = item  # Conserva la cotización más reciente si viene repetida

    unique_batch = list(dedup.values())

    stmt = insert(HistoricoPrecio).values(unique_batch)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_historico_carta_tienda_fecha",
        set_={"precio_usd": stmt.excluded.precio_usd}
    )
    session.execute(stmt)


def run_price_ingestion():
    """
    Pipeline ETL Refinado:
    1. Descarga el mapa de identificadores de MTGJSON (UUID -> Scryfall ID).
    2. Descarga AllPricesToday.json.gz.
    3. Cruza cotizaciones con el catálogo de cartas local en PostgreSQL.
    4. Inserta o actualiza precios con UUID generado por fila en lotes de 5.000.
    """
    session = SessionLocal()
    hoy = date.today()

    try:
        # 1. Obtener conjunto de IDs locales para no violar Foreign Key
        logger.info("Consultando catálogo de cartas local en PostgreSQL...")
        scryfall_ids_locales = {
            str(row[0]) for row in session.query(CartaScryfall.id).all()
        }
        logger.info(f"Total de cartas en catálogo local: {len(scryfall_ids_locales)}")

        if not scryfall_ids_locales:
            logger.warning("No hay cartas cargadas en la tabla 'cartas'. Abortando ingesta de precios.")
            return

        # 2. Descargar y construir mapa de UUID MTGJSON -> Scryfall ID
        identifiers_data = download_and_parse_gz(MTGJSON_IDENTIFIERS_URL, "Identificadores MTGJSON")
        uuid_to_scryfall: Dict[str, str] = {}

        for mtg_uuid, card_info in identifiers_data.items():
            scryfall_id = card_info.get("identifiers", {}).get("scryfallId")
            if scryfall_id and scryfall_id in scryfall_ids_locales:
                uuid_to_scryfall[mtg_uuid] = scryfall_id

        logger.info(f"Cartas mapeadas coincidentes con catálogo local: {len(uuid_to_scryfall)}")
        del identifiers_data  # Liberar memoria

        # 3. Descargar precios de hoy
        prices_data = download_and_parse_gz(MTGJSON_PRICES_TODAY_URL, "Precios del día (AllPricesToday)")

        lote_precios: List[Dict[str, Any]] = []
        total_ingresados = 0

        logger.info("Iniciando procesamiento y extracción de precios...")

        for mtg_uuid, price_obj in prices_data.items():
            scryfall_id = uuid_to_scryfall.get(mtg_uuid)
            if not scryfall_id:
                continue

            paper_prices = price_obj.get("paper", {})

            # ---------------------------------------------------------
            # A. CARD KINGDOM - Retail Normal y Foil
            # ---------------------------------------------------------
            ck_data = paper_prices.get("cardkingdom", {}).get("retail", {})
            
            # Normal
            ck_normal_dict = ck_data.get("normal", {})
            if ck_normal_dict:
                val = list(ck_normal_dict.values())[-1]
                if val is not None:
                    lote_precios.append({
                        "id": str(uuid.uuid4()),
                        "scryfall_card_id": scryfall_id,
                        "tienda": "cardkingdom",
                        "tipo": "normal",
                        "precio_usd": float(val),
                        "fecha": hoy
                    })

            # Foil
            ck_foil_dict = ck_data.get("foil", {})
            if ck_foil_dict:
                val = list(ck_foil_dict.values())[-1]
                if val is not None:
                    lote_precios.append({
                        "id": str(uuid.uuid4()),
                        "scryfall_card_id": scryfall_id,
                        "tienda": "cardkingdom",
                        "tipo": "foil",
                        "precio_usd": float(val),
                        "fecha": hoy
                    })

            # ---------------------------------------------------------
            # B. TCGPLAYER - Retail Normal y Foil
            # ---------------------------------------------------------
            tcg_data = paper_prices.get("tcgplayer", {}).get("retail", {})
            
            # Normal
            tcg_normal_dict = tcg_data.get("normal", {})
            if tcg_normal_dict:
                val = list(tcg_normal_dict.values())[-1]
                if val is not None:
                    lote_precios.append({
                        "id": str(uuid.uuid4()),
                        "scryfall_card_id": scryfall_id,
                        "tienda": "tcgplayer",
                        "tipo": "normal",
                        "precio_usd": float(val),
                        "fecha": hoy
                    })

            # Foil
            tcg_foil_dict = tcg_data.get("foil", {})
            if tcg_foil_dict:
                val = list(tcg_foil_dict.values())[-1]
                if val is not None:
                    lote_precios.append({
                        "id": str(uuid.uuid4()),
                        "scryfall_card_id": scryfall_id,
                        "tienda": "tcgplayer",
                        "tipo": "foil",
                        "precio_usd": float(val),
                        "fecha": hoy
                    })

            # Inserción por lotes
            if len(lote_precios) >= BATCH_SIZE:
                execute_batch_upsert(session, lote_precios)
                total_ingresados += len(lote_precios)
                lote_precios.clear()

        # Insertar remanente
        if lote_precios:
            execute_batch_upsert(session, lote_precios)
            total_ingresados += len(lote_precios)
            lote_precios.clear()

        session.commit()
        logger.info(f"Ingesta finalizada con éxito. Total registros procesados/actualizados: {total_ingresados}")

    except Exception as e:
        session.rollback()
        logger.error(f"Error durante la sincronización de precios: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_price_ingestion()