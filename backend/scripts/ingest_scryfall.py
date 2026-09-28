import sys
import gzip
import json
import requests
from typing import Generator, Dict, Any
from sqlalchemy.dialects.postgresql import insert
from app.database import SessionLocal
from app.models import CartaScryfall
from app.core.config import settings

BATCH_SIZE = 2000


def stream_scryfall_raw_cards() -> Generator[Dict[str, Any], None, None]:
    """
    Descarga por streaming el archivo .jsonl.gz de 'default_cards' de Scryfall
    y produce objetos JSON uno a uno sin cargar el catálogo completo en memoria.
    """
    headers = {
        "User-Agent": settings.SCRYFALL_USER_AGENT,
        "Accept": settings.SCRYFALL_ACCEPT_HEADER
    }
    bulk_info_url = "https://api.scryfall.com/bulk-data"
    print("📡 Consultando endpoint de Bulk Data de Scryfall...")
    response = requests.get(bulk_info_url, headers=headers, timeout=30)
    response.raise_for_status()

    items = response.json().get("data", [])
    target_item = next((item for item in items if item.get("type") == "default_cards"), None)

    if not target_item:
        raise ValueError("No se encontró el objeto 'default_cards' en la respuesta de Scryfall.")

    download_uri = target_item.get("jsonl_download_uri") or target_item.get("download_uri")
    if not download_uri:
        raise ValueError("No se encontró la URI de descarga de default_cards.")

    print(f"📥 Descargando catálogo masivo (stream) desde: {download_uri}")
    bulk_response = requests.get(download_uri, headers=headers, stream=True, timeout=60)
    bulk_response.raise_for_status()

    # Streaming gzip directo sin guardar todo el archivo en memoria ni en disco
    with gzip.GzipFile(fileobj=bulk_response.raw) as gz:
        for line in gz:
            line_str = line.decode("utf-8").strip()
            if line_str:
                yield json.loads(line_str)


def transform_card_to_row(card: Dict[str, Any]) -> Dict[str, Any]:
    """Extrae y normaliza los atributos para la fila de la base de datos."""
    image_url = None
    if "image_uris" in card:
        image_url = card["image_uris"].get("normal")
    elif "card_faces" in card and isinstance(card["card_faces"], list) and len(card["card_faces"]) > 0:
        face = card["card_faces"][0]
        if "image_uris" in face:
            image_url = face["image_uris"].get("normal")

    return {
        "id": card.get("id"),
        "name": card.get("name"),
        "set": card.get("set"),
        "type_line": card.get("type_line"),
        "mana_cost": card.get("mana_cost"),
        "image_url": image_url,
        "scryfall_raw_data": card
    }


def upsert_batch(session, batch: list[dict]):
    """
    Inserta o actualiza un lote de cartas mediante ON CONFLICT en PostgreSQL.
    No borra el histórico de precios ni las relaciones existentes.
    """
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
        print("🚀 Iniciando ingesta no destructiva con upsert por lotes...")
        for raw_card in stream_scryfall_raw_cards():
            card_id = raw_card.get("id")
            if not card_id:
                continue

            batch.append(transform_card_to_row(raw_card))

            if len(batch) >= BATCH_SIZE:
                upsert_batch(session, batch)
                session.commit()
                total_processed += len(batch)
                print(f"📦 Cartas procesadas y sincronizadas: {total_processed}")
                batch.clear()

        if batch:
            upsert_batch(session, batch)
            session.commit()
            total_processed += len(batch)
            batch.clear()

        print(f"✅ Ingesta finalizada con éxito. Total sincronizado: {total_processed} cartas.")

    except Exception as e:
        session.rollback()
        print(f"❌ Error crítico durante la ingesta: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    run_ingest()