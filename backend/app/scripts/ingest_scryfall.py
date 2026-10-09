# app/scripts/ingest_scryfall.py
# ---------------------------------------------------------
# SCRIPT ETL: INGESTA STREAMING RESILIENTE (DEFAULT CARDS -> POSTGRES)
# OPTIMIZADO PARA CLOUD (RAILWAY/SUPABASE): IDEMPOTENTE, SIN DDL PESADO, SIN OOM
# ---------------------------------------------------------
import os
import sys
import time
import gzip
import json
import logging
from typing import Generator, Dict, Any, List, Optional, Set
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sqlalchemy.dialects.postgresql import insert

from app.models.card import CartaScryfall
from app.database import db_url, connect_args

try:
    from app.core.config import settings
    USER_AGENT = getattr(settings, "SCRYFALL_USER_AGENT", "MTGTradeApp/1.0 (Scryfall Sync Engine)")
    ACCEPT_HEADER = getattr(settings, "SCRYFALL_ACCEPT_HEADER", "application/json;q=0.9,*/*;q=0.8")
except Exception:
    USER_AGENT = "MTGTradeApp/1.0 (Scryfall Sync Engine)"
    ACCEPT_HEADER = "application/json;q=0.9,*/*;q=0.8"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest_scryfall")

etl_engine = create_engine(
    db_url,
    poolclass=NullPool,
    connect_args=connect_args
)


def verify_connection() -> None:
    """Valida la conectividad básica con PostgreSQL sin ejecutar DDL bloqueante."""
    logger.info("Verificando estado de conexión con PostgreSQL...")
    retries = 5
    for attempt in range(1, retries + 1):
        try:
            with etl_engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            logger.info("Conexión con PostgreSQL confirmada.")
            return
        except Exception as e:
            wait_s = attempt * 3
            logger.warning(f"Intento {attempt}/{retries} de conexión fallido: {e}. Esperando {wait_s}s...")
            time.sleep(wait_s)
            if attempt == retries:
                raise


def create_indexes_if_missing() -> None:
    """Asegura el índice GIN de búsqueda de texto solo si no existe."""
    logger.info("Verificando existencia del índice de búsqueda...")
    try:
        with etl_engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_cartas_name_trgm 
                ON cartas USING gin (name gin_trgm_ops);
            """))
        logger.info("Índice de búsqueda verificado.")
    except Exception as exc:
        logger.warning(f"Aviso al verificar índices (no crítico): {exc}")


class ScryfallCardNormalizer:
    @staticmethod
    def _extract_image_url(card_data: Dict[str, Any], faces: List[Dict[str, Any]]) -> Optional[str]:
        image_uris = card_data.get("image_uris")
        if isinstance(image_uris, dict):
            return image_uris.get("normal") or image_uris.get("small")

        if faces:
            first_face = faces[0]
            face_uris = first_face.get("image_uris")
            if isinstance(face_uris, dict):
                return face_uris.get("normal") or face_uris.get("small")

        return None

    @staticmethod
    def _extract_composite_field(card_data: Dict[str, Any], faces: List[Dict[str, Any]], field_name: str) -> Optional[str]:
        value = card_data.get(field_name)
        if value:
            return str(value)

        if faces:
            sub_values = [str(f.get(field_name, "")) for f in faces if f.get(field_name)]
            if sub_values:
                return " // ".join(sub_values)

        return None

    @staticmethod
    def _extract_colors(card_data: Dict[str, Any]) -> str:
        raw_colors = card_data.get("colors")
        if isinstance(raw_colors, list) and raw_colors:
            return ",".join(raw_colors)
        
        type_line = str(card_data.get("type_line", ""))
        if "Land" not in type_line:
            return "C"
        return ""

    @staticmethod
    def _extract_color_identity(card_data: Dict[str, Any]) -> str:
        raw_identity = card_data.get("color_identity") or []
        if isinstance(raw_identity, list) and raw_identity:
            wubrg_order = {"W": 0, "U": 1, "B": 2, "R": 3, "G": 4}
            cleaned = [str(c).upper().strip() for c in raw_identity if str(c).upper().strip() in wubrg_order]
            cleaned.sort(key=lambda c: wubrg_order.get(c, 99))
            return ",".join(cleaned)
        return ""

    @staticmethod
    def _extract_oracle_id(card_data: Dict[str, Any], faces: List[Dict[str, Any]]) -> Optional[str]:
        oracle_id = card_data.get("oracle_id")
        if not oracle_id and faces:
            oracle_id = faces[0].get("oracle_id")
        return str(oracle_id) if oracle_id else None

    @classmethod
    def to_orm_dict(cls, card_data: Dict[str, Any]) -> Dict[str, Any]:
        faces = card_data.get("card_faces") if isinstance(card_data.get("card_faces"), list) else []

        raw_cmc = card_data.get("cmc", 0.0)
        try:
            cmc_val = float(raw_cmc) if raw_cmc is not None else 0.0
        except (ValueError, TypeError):
            cmc_val = 0.0

        return {
            "id": str(card_data.get("id")),
            "oracle_id": cls._extract_oracle_id(card_data, faces),
            "name": str(card_data.get("name", "Desconocido")),
            "set": str(card_data.get("set", "")).upper(),
            "type_line": cls._extract_composite_field(card_data, faces, "type_line"),
            "mana_cost": cls._extract_composite_field(card_data, faces, "mana_cost"),
            "cmc": cmc_val,
            "rarity": str(card_data.get("rarity") or "common").lower(),
            "colors": cls._extract_colors(card_data),
            "color_identity": cls._extract_color_identity(card_data),
            "oracle_text": cls._extract_composite_field(card_data, faces, "oracle_text"),
            "image_url": cls._extract_image_url(card_data, faces)
        }


class ScryfallIngestionService:
    BULK_DATA_METADATA_URL: str = "https://api.scryfall.com/bulk-data"
    BATCH_SIZE: int = 250

    def __init__(self) -> None:
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": ACCEPT_HEADER
        }

    def _resolve_download_uri(self) -> str:
        logger.info("Consultando endpoint Bulk Data de Scryfall...")
        with requests.get(self.BULK_DATA_METADATA_URL, headers=self.headers, timeout=30) as response:
            response.raise_for_status()
            items = response.json().get("data", [])
            target = next((item for item in items if item.get("type") == "default_cards"), None)

        if not target:
            raise ValueError("No se encontró 'default_cards' en Bulk Data.")

        uri = target.get("download_uri") or target.get("jsonl_download_uri")
        if not uri:
            raise ValueError("URI de descarga vacía para default_cards.")
        return uri

    def stream_cards(self, download_uri: str) -> Generator[Dict[str, Any], None, None]:
        logger.info(f"Iniciando descarga streaming desde: {download_uri}")
        with requests.get(download_uri, headers=self.headers, stream=True, timeout=180) as resp:
            resp.raise_for_status()

            if download_uri.endswith(".gz") or resp.headers.get("Content-Type") == "application/gzip":
                stream = gzip.GzipFile(fileobj=resp.raw)
            else:
                stream = resp.raw

            for line in stream:
                line_str = line.decode("utf-8").strip()
                if line_str in ("[", "]", ","):
                    continue
                if line_str.endswith(","):
                    line_str = line_str[:-1]
                if line_str:
                    try:
                        yield json.loads(line_str)
                    except json.JSONDecodeError:
                        continue

    def commit_with_retry(self, batch: List[Dict[str, Any]], retries: int = 5) -> None:
        if not batch:
            return

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
                "color_identity": stmt.excluded.color_identity,
                "oracle_text": stmt.excluded.oracle_text,
                "image_url": stmt.excluded.image_url
            }
        )

        for attempt in range(1, retries + 1):
            try:
                with etl_engine.begin() as conn:
                    conn.execute(stmt)
                time.sleep(0.03)  # Pausa breve para mitigar consumo de RAM en Railway
                return
            except Exception as e:
                sleep_time = attempt * 3
                logger.warning(f"Aviso en intento {attempt}/{retries} guardando lote: {e}. Esperando {sleep_time}s...")
                time.sleep(sleep_time)
                if attempt == retries:
                    raise

    def execute_sync(self) -> int:
        download_uri = self._resolve_download_uri()
        total_processed = 0
        batch: List[Dict[str, Any]] = []

        for raw_card in self.stream_cards(download_uri):
            if not raw_card.get("id"):
                continue

            normalized = ScryfallCardNormalizer.to_orm_dict(raw_card)
            batch.append(normalized)

            if len(batch) >= self.BATCH_SIZE:
                self.commit_with_retry(batch)
                total_processed += len(batch)
                if total_processed % 6000 == 0:
                    logger.info(f"Progreso: {total_processed} cartas procesadas...")
                batch.clear()

        if batch:
            self.commit_with_retry(batch)
            total_processed += len(batch)
            batch.clear()

        return total_processed


def run_ingest() -> None:
    try:
        verify_connection()
        service = ScryfallIngestionService()
        total = service.execute_sync()
        logger.info(f"Carga de cartas finalizada: {total} procesadas.")
        
        create_indexes_if_missing()
        logger.info("Proceso ETL completado con éxito al 100%.")
    except Exception as e:
        logger.error(f"Fallo crítico en la ingesta: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    run_ingest()