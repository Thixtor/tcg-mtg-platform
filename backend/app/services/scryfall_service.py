# app/services/scryfall_service.py
# ---------------------------------------------------------
# SERVICIO DE INTEGRACIÓN EXTERNA: CATÁLOGO SCRYFALL (MTG)
# ---------------------------------------------------------
"""
Servicio cliente para la sincronización e ingesta de cartas desde la API de Scryfall.
Normaliza la identidad de color (color_identity) a formato canónico WUBRG,
gestiona rate-limiting preventivo y cumple las políticas de cabeceras de Scryfall.
"""

import time
import logging
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy.orm import Session, defer

from app.models.card import CartaScryfall
from app.core.config import settings

logger = logging.getLogger("scryfall_service")

SCRYFALL_BASE_URL = "https://api.scryfall.com"
SCRYFALL_HEADERS = {
    "User-Agent": f"{settings.PROJECT_NAME}/1.0 (contact: admin@example.com)",
    "Accept": "application/json;q=0.9,*/*;q=0.8"
}


class ScryfallService:

    @staticmethod
    def normalize_color_identity(raw_identity: Optional[List[str]]) -> str:
        """
        Normaliza la lista de colores de Scryfall a una cadena canónica separada por comas (ej: 'W,U').
        Para cartas incoloras retorna una cadena vacía ''.
        """
        if not raw_identity or not isinstance(raw_identity, list):
            return ""
        wubrg_order = {"W": 0, "U": 1, "B": 2, "R": 3, "G": 4}
        cleaned = [c.strip().upper() for c in raw_identity if c.strip().upper() in wubrg_order]
        cleaned.sort(key=lambda c: wubrg_order.get(c, 99))
        return ",".join(cleaned)

    @classmethod
    def upsert_scryfall_card(cls, db: Session, card_data: Dict[str, Any]) -> CartaScryfall:
        """
        Crea o actualiza una carta en el catálogo local a partir del payload JSON de Scryfall.
        Persiste explícitamente la columna nativa color_identity y adapta los nombres de columnas.
        """
        scryfall_id = card_data.get("id")
        if not scryfall_id:
            raise ValueError("El objeto de carta de Scryfall carece de campo 'id'.")

        card = db.query(CartaScryfall).filter(CartaScryfall.id == scryfall_id).first()
        color_id_str = cls.normalize_color_identity(card_data.get("color_identity", []))
        set_value = card_data.get("set", "").upper()

        # Extracción segura de imágenes
        image_url = None
        if "image_uris" in card_data and card_data["image_uris"]:
            image_url = card_data["image_uris"].get("normal") or card_data["image_uris"].get("small")
        elif "card_faces" in card_data and card_data["card_faces"]:
            front_face = card_data["card_faces"][0]
            if "image_uris" in front_face and front_face["image_uris"]:
                image_url = front_face["image_uris"].get("normal")

        if not card:
            init_kwargs = {
                "id": scryfall_id,
                "name": card_data.get("name", "Desconocido"),
                "collector_number": str(card_data.get("collector_number", "")),
                "type_line": card_data.get("type_line", ""),
                "oracle_text": card_data.get("oracle_text", ""),
                "cmc": float(card_data.get("cmc", 0.0) or 0.0),
                "color_identity": color_id_str,
                "image_url": image_url,
                "scryfall_raw_data": card_data
            }
            # Detectar si el modelo usa set o set_code
            if hasattr(CartaScryfall, "set"):
                init_kwargs["set"] = set_value
            elif hasattr(CartaScryfall, "set_code"):
                init_kwargs["set_code"] = set_value

            card = CartaScryfall(**init_kwargs)
            db.add(card)
        else:
            card.name = card_data.get("name", card.name)
            card.collector_number = str(card_data.get("collector_number", getattr(card, "collector_number", "")))
            card.type_line = card_data.get("type_line", card.type_line)
            card.oracle_text = card_data.get("oracle_text", card.oracle_text)
            card.cmc = float(card_data.get("cmc", card.cmc) or 0.0)
            card.color_identity = color_id_str
            card.image_url = image_url or card.image_url
            card.scryfall_raw_data = card_data

            if hasattr(card, "set"):
                setattr(card, "set", set_value)
            elif hasattr(card, "set_code"):
                setattr(card, "set_code", set_value)

        db.commit()
        db.refresh(card)
        return card

    @classmethod
    def fetch_and_store_by_name(cls, db: Session, card_name: str) -> Optional[CartaScryfall]:
        url = f"{SCRYFALL_BASE_URL}/cards/named"
        params = {"fuzzy": card_name.strip()}

        with httpx.Client(headers=SCRYFALL_HEADERS, timeout=10.0) as client:
            response = client.get(url, params=params)
            time.sleep(0.1)  # Respetar rate limit de Scryfall

            if response.status_code == 404:
                logger.info(f"Carta no encontrada en Scryfall: '{card_name}'")
                return None
            response.raise_for_status()
            data = response.json()

        return cls.upsert_scryfall_card(db, data)

    @classmethod
    def search_local_catalog(
        cls, 
        db: Session, 
        query: str, 
        limit: int = 20
    ) -> List[CartaScryfall]:
        return (
            db.query(CartaScryfall)
            .options(defer(CartaScryfall.scryfall_raw_data))
            .filter(CartaScryfall.name.ilike(f"%{query.strip()}%"))
            .limit(limit)
            .all()
        )