# app/scripts/ingest_scryfall.py
# ---------------------------------------------------------
# SCRIPT ETL: INGESTA Y SINCRONIZACIÓN BULK DATA (SCRYFALL)
# ---------------------------------------------------------
import sys
import gzip
import json
import logging
from typing import Generator, Dict, Any, List
import requests
from sqlalchemy.dialects.postgresql import insert

from app.database import SessionLocal
from app.models.card import CartaScryfall
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest_scryfall")

BATCH_SIZE = 2000


def stream_scryfall_raw_cards() -> Generator[Dict[str, Any], None, None]:
    """
    Descarga en streaming el archivo Default Cards de Scryfall.
    Soporta tanto JSON Lines (.jsonl) como arrays JSON tradicionales delimitados por coma.
    """
    headers = {
        "User-Agent": settings.SCRYFALL_USER_AGENT,
        "Accept": settings.SCRYFALL_ACCEPT_HEADER
    }
    bulk_info_url = "https://api.scryfall.com/bulk-data"
    logger.info("Consultando endpoint Bulk Data de Scryfall...")
    
    with requests.get(bulk_info_url, headers=headers, timeout=30) as response:
        response.raise_for_status()
        items = response.json().get("data", [])
        target_item = next((item for item in items if item.get("type") == "default_cards"), None)

    if not target_item:
        raise ValueError("No se encontró el objeto 'default_cards' en la API de Scryfall.")

    download_uri = target_item.get("jsonl_download_uri") or target_item.get("download_uri")
    logger.info(f"Descargando catálogo vía stream desde: {download_uri}")

    # stream=True y decodificación de líneas para procesar sin saturar la RAM
    with requests.get(download_uri, headers=headers, stream=True, timeout=120) as bulk_response:
        bulk_response.raise_for_status()
        
        # Si el endpoint viene comprimido en gzip y requests no lo descomprimió automáticamente
        if download_uri.endswith(".gz") or bulk_response.headers.get("Content-Type") == "application/gzip":
            raw_stream = gzip.GzipFile(fileobj=bulk_response.raw)
        else:
            raw_stream = bulk_response.raw

        for line in raw_stream:
            line_str = line.decode("utf-8").strip()
            # Ignorar corchetes de inicio/fin de array si viene como JSON array
            if line_str in ("[", "]", ","):
                continue
            if line_str.endswith(","):
                line_str = line_str[:-1]
            if line_str:
                try:
                    yield json.loads(line_str)
                except json.JSONDecodeError:
                    continue


def extract_card_properties(card: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrae atributos normalizados e indexables para la BD.
    Garantiza el guardado de oracle_id y type_line para soporte canónico de MTG (CR 108.1 y CR 205.2b).
    """
    card_faces = card.get("card_faces") if isinstance(card.get("card_faces"), list) else []

    # Imagen
    image_url = None
    if "image_uris" in card and isinstance(card["image_uris"], dict):
        image_url = card["image_uris"].get("normal")
    elif card_faces and len(card_faces) > 0:
        face = card_faces[0]
        if "image_uris" in face and isinstance(face["image_uris"], dict):
            image_url = face["image_uris"].get("normal")

    # Type line con soporte para cartas de dos caras (DFCs)
    type_line = card.get("type_line")
    if not type_line and card_faces:
        type_line = " // ".join(f.get("type_line", "") for f in card_faces if f.get("type_line"))

    # Mana cost
    mana_cost = card.get("mana_cost")
    if not mana_cost and card_faces:
        mana_cost = " // ".join(f.get("mana_cost", "") for f in card_faces if f.get("mana_cost"))

    # Oracle text
    oracle_text = card.get("oracle_text")
    if not oracle_text and card_faces:
        oracle_text = " // ".join(f.get("oracle_text", "") for f in card_faces if f.get("oracle_text"))

    # Colores
    raw_colors = card.get("colors") or card.get("color_identity") or []
    colors_str = ",".join(raw_colors) if raw_colors else "C"

    # oracle_id es la clave funcional canónica de MTG
    oracle_id = card.get("oracle_id")
    if not oracle_id and card_faces and len(card_faces) > 0:
        oracle_id = card_faces[0].get("oracle_id")

    return {
        "id": card.get("id"),
        "oracle_id": oracle_id,
        "name": card.get("name"),
        "set": card.get("set"),
        "type_line": type_line,
        "mana_cost": mana_cost,
        "cmc": float(card.get("cmc") or 0.0),
        "rarity": (card.get("rarity") or "common").lower(),
        "colors": colors_str,
        "oracle_text": oracle_text,
        "image_url": image_url,
        "scryfall_raw_data": card
    }


def upsert_batch(session, batch: List[Dict[str, Any]]):
    if not batch:
        return

    # Deduplicar en memoria por ID para evitar PostgreSQL CardinalityViolation
    dedup: Dict[str, Dict[str, Any]] = {item["id"]: item for item in batch}
    unique_batch = list(dedup.values())

    stmt = insert(CartaScryfall).values(unique_batch)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={
            "oracle_id": stmt.excluded.oracle_id,
            "name": stmt.excluded.name,
            "set": stmt.excluded.set,
            "type_line": stmt.excluded.type_line,
            "mana_cost": stmt.excluded.mana_cost,
            "cmc": stmt.excluded.cmc,
            "rarity": stmt.excluded.rarity,
            "colors": stmt.excluded.colors,
            "oracle_text": stmt.excluded.oracle_text,
            "image_url": stmt.excluded.image_url,
            "scryfall_raw_data": stmt.excluded.scryfall_raw_data
        }
    )
    session.execute(stmt)


def run_ingest():
    session = SessionLocal()
    total_processed = 0
    batch = []

    try:
        logger.info("Iniciando ingesta de cartas desde Scryfall...")
        for raw_card in stream_scryfall_raw_cards():
            if not raw_card.get("id"):
                continue

            batch.append(extract_card_properties(raw_card))

            if len(batch) >= BATCH_SIZE:
                upsert_batch(session, batch)
                session.commit()
                total_processed += len(batch)
                logger.info(f"Cartas procesadas: {total_processed}")
                batch.clear()

        if batch:
            upsert_batch(session, batch)
            session.commit()
            total_processed += len(batch)
            batch.clear()

        logger.info(f"Ingesta completada exitosamente. Total sincronizado: {total_processed} cartas.")
    except Exception as e:
        session.rollback()
        logger.error(f"Error crítico durante la ingesta: {e}", exc_info=True)
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    run_ingest()