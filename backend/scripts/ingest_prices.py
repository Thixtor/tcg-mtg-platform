import io
import gzip
import json
import logging
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

# URL del volcado diario ligero de precios de MTGJSON
MTGJSON_PRICES_TODAY_URL = "https://mtgjson.com/api/v5/AllPricesToday.json.gz"
BATCH_SIZE = 5000


def execute_batch_upsert(session, batch: List[Dict[str, Any]]) -> None:
    """
    Ejecuta un UPSERT sobre la tabla historico_precios basándose en la
    restricción única (scryfall_card_id, tienda, tipo, fecha).
    """
    if not batch:
        return

    stmt = insert(HistoricoPrecio).values(batch)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_historico_carta_tienda_fecha",
        set_={"precio_usd": stmt.excluded.precio_usd}
    )
    session.execute(stmt)


def run_price_ingestion():
    """
    Pipeline ETL:
    1. Descarga y descomprime AllPricesToday.json.gz en memoria.
    2. Cruza los scryfallId con el catálogo de cartas local en PostgreSQL.
    3. Extrae cotizaciones para Card Kingdom (retail) y TCGplayer (market/retail).
    4. Inserta o actualiza los registros del día en lotes de 5.000.
    """
    logger.info("Iniciando descarga de precios diarios desde MTGJSON...")
    headers = {
        "User-Agent": "MTGCardMarketApp/1.0 (Price Ingestion Engine)"
    }

    try:
        response = requests.get(MTGJSON_PRICES_TODAY_URL, headers=headers, stream=True, timeout=60)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Error descargando AllPricesToday.json.gz: {e}")
        return

    logger.info("Descomprimiendo archivo en memoria...")
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as gz:
            data = json.load(gz).get("data", {})
    except Exception as e:
        logger.error(f"Error parseando el JSON de MTGJSON: {e}")
        return

    logger.info(f"Cartas parseadas en MTGJSON: {len(data)}. Conectando a PostgreSQL...")
    session = SessionLocal()
    hoy = date.today()

    try:
        # 1. Obtener conjunto de IDs existentes en nuestra base de datos para no violar FK
        scryfall_ids_locales = {
            row[0] for row in session.query(CartaScryfall.id).all()
        }
        logger.info(f"Total de cartas en catálogo local 'cartas': {len(scryfall_ids_locales)}")

        lote_precios: List[Dict[str, Any]] = []
        total_ingresados = 0

        for uuid_mtgjson, card_info in data.items():
            scryfall_id = card_info.get("identifiers", {}).get("scryfallId")

            # Solo procesar si la carta existe en nuestro catálogo local
            if not scryfall_id or scryfall_id not in scryfall_ids_locales:
                continue

            prices = card_info.get("prices", {})

            # ---------------------------------------------------------
            # A. CARD KINGDOM - Retail Normal y Foil
            # ---------------------------------------------------------
            ck_data = prices.get("cardkingdom", {}).get("retail", {})
            
            # Normal
            ck_normal_dict = ck_data.get("normal", {})
            if ck_normal_dict:
                ultimo_precio_ck = list(ck_normal_dict.values())[-1]
                if ultimo_precio_ck is not None:
                    lote_precios.append({
                        "scryfall_card_id": scryfall_id,
                        "tienda": "cardkingdom",
                        "tipo": "normal",
                        "precio_usd": float(ultimo_precio_ck),
                        "fecha": hoy
                    })

            # Foil
            ck_foil_dict = ck_data.get("foil", {})
            if ck_foil_dict:
                ultimo_precio_ck_foil = list(ck_foil_dict.values())[-1]
                if ultimo_precio_ck_foil is not None:
                    lote_precios.append({
                        "scryfall_card_id": scryfall_id,
                        "tienda": "cardkingdom",
                        "tipo": "foil",
                        "precio_usd": float(ultimo_precio_ck_foil),
                        "fecha": hoy
                    })

            # ---------------------------------------------------------
            # B. TCGPLAYER - Retail Normal y Foil
            # ---------------------------------------------------------
            tcg_data = prices.get("tcgplayer", {}).get("retail", {})
            
            # Normal
            tcg_normal_dict = tcg_data.get("normal", {})
            if tcg_normal_dict:
                ultimo_precio_tcg = list(tcg_normal_dict.values())[-1]
                if ultimo_precio_tcg is not None:
                    lote_precios.append({
                        "scryfall_card_id": scryfall_id,
                        "tienda": "tcgplayer",
                        "tipo": "normal",
                        "precio_usd": float(ultimo_precio_tcg),
                        "fecha": hoy
                    })

            # Foil
            tcg_foil_dict = tcg_data.get("foil", {})
            if tcg_foil_dict:
                ultimo_precio_tcg_foil = list(tcg_foil_dict.values())[-1]
                if ultimo_precio_tcg_foil is not None:
                    lote_precios.append({
                        "scryfall_card_id": scryfall_id,
                        "tienda": "tcgplayer",
                        "tipo": "foil",
                        "precio_usd": float(ultimo_precio_tcg_foil),
                        "fecha": hoy
                    })

            # Inserción periódica en lotes
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