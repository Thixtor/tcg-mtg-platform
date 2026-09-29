import sys
import gzip
import json
import logging
from typing import Generator, Dict, Any
import requests
from sqlalchemy.dialects.postgresql import insert

from app.database import SessionLocal
from app.models.card import CartaScryfall
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest")

BATCH_SIZE = 2000


def stream_scryfall_raw_cards() -> Generator[Dict[str, Any], None, None]:
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
        raise ValueError("No se encontró el objeto 'default_cards' en Scryfall.")

    download_uri = target_item.get("jsonl_download_uri") or target_item.get("download_uri")
    logger.info(f"Descargando catálogo vía stream desde: {download_uri}")

    with requests.get(download_uri, headers=headers, stream=True, timeout=60) as bulk_response:
        bulk_response.raise_for_status()
        with gzip.GzipFile(fileobj=bulk_response.raw) as gz:
            for line in gz:
                line_str = line.decode("utf-8").strip()
                if line_str:
                    yield json.loads(line_str)


def extract_card_properties(card: Dict[str, Any]) -> Dict[str, Any]:
    """Extrae atributos nativos normalizados para la BD."""
    image_url = None
    if "image_uris" in card:
        image_url = card["image_uris"].get("normal")
    elif "card_faces" in card and isinstance(card["card_faces"], list) and len(card["card_faces"]) > 0:
        face = card["card_faces"][0]
        if "image_uris" in face:
            image_url = face["image_uris"].get("normal")

    # Oracle text
    oracle_text = card.get("oracle_text")
    if not oracle_text and "card_faces" in card and isinstance(card["card_faces"], list):
        oracle_text = " // ".join(f.get("oracle_text", "") for f in card["card_faces"] if f.get("oracle_text"))

    # Colores
    raw_colors = card.get("colors") or card.get("color_identity") or []
    colors_str = ",".join(raw_colors) if raw_colors else "C"

    return {
        "id": card.get("id"),
        "name": card.get("name"),
        "set": card.get("set"),
        "type_line": card.get("type_line"),
        "mana_cost": card.get("mana_cost"),
        "cmc": float(card.get("cmc") or 0.0),
        "rarity": (card.get("rarity") or "common").lower(),
        "colors": colors_str,
        "oracle_text": oracle_text,
        "image_url": image_url,
        "scryfall_raw_data": card
    }


def upsert_batch(session, batch: list[dict]):
    if not batch:
        return

    stmt = insert(CartaScryfall).values(batch)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={
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
        logger.info("Iniciando ingesta no destructiva...")
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

        logger.info(f"Ingesta completada. Total sincronizado: {total_processed} cartas.")
    except Exception as e:
        session.rollback()
        logger.error(f"Error crítico en la ingesta: {e}", exc_info=True)
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    run_ingest()