# app/services/scryfall_service.py
# ---------------------------------------------------------
# SERVICIO DE INTEGRACIÓN EXTERNA: CATÁLOGO SCRYFALL (MTG)
# ---------------------------------------------------------
"""
Servicio cliente para la sincronización e ingesta de cartas desde la API de Scryfall.
Normaliza la identidad de color (color_identity) a formato canónico WUBRG,
recupera todas las impresiones/versiones (unique=prints), gestiona timeouts
estrictos y cumple las políticas de cabeceras de Scryfall.
"""

import logging
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy.orm import Session

from app.models.card import CartaScryfall
from app.core.config import settings

logger = logging.getLogger("scryfall_service")

SCRYFALL_BASE_URL = "https://api.scryfall.com"
SCRYFALL_HEADERS = {
    "User-Agent": f"{getattr(settings, 'PROJECT_NAME', 'MTGApp')}/1.0 (contact: admin@example.com)",
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
    def upsert_scryfall_card(cls, db: Session, card_data: Dict[str, Any]) -> Optional[CartaScryfall]:
        """
        Crea o actualiza una carta en el catálogo local a partir del payload JSON de Scryfall.
        Persiste únicamente las columnas existentes en el modelo CartaScryfall.
        """
        scryfall_id = card_data.get("id")
        if not scryfall_id:
            return None

        try:
            card = db.query(CartaScryfall).filter(CartaScryfall.id == scryfall_id).first()
            color_id_str = cls.normalize_color_identity(card_data.get("color_identity", []))
            colors_list = card_data.get("colors", [])
            colors_str = ",".join(colors_list) if colors_list else ("C" if card_data.get("type_line", "") and "Land" not in card_data.get("type_line", "") else "")
            set_value = card_data.get("set", "").upper()

            # Extracción segura de imágenes (incluyendo cartas de doble cara)
            image_url = None
            if "image_uris" in card_data and card_data["image_uris"]:
                image_url = card_data["image_uris"].get("normal") or card_data["image_uris"].get("small")
            elif "card_faces" in card_data and card_data["card_faces"]:
                front_face = card_data["card_faces"][0]
                if "image_uris" in front_face and front_face["image_uris"]:
                    image_url = front_face["image_uris"].get("normal")

            oracle_id = card_data.get("oracle_id")
            mana_cost = card_data.get("mana_cost")
            oracle_text = card_data.get("oracle_text")

            # Fallback para cartas split/doble cara sin texto u oráculo frontal
            if "card_faces" in card_data and card_data["card_faces"]:
                faces = card_data["card_faces"]
                if not mana_cost and len(faces) > 0:
                    mana_cost = faces[0].get("mana_cost")
                if not oracle_text:
                    oracle_text = " // ".join(f.get("oracle_text", "") for f in faces if f.get("oracle_text"))

            card_name = card_data.get("name", "Desconocido")

            if not card:
                card = CartaScryfall(
                    id=scryfall_id,
                    oracle_id=oracle_id,
                    name=card_name,
                    set=set_value,
                    type_line=card_data.get("type_line", ""),
                    mana_cost=mana_cost,
                    image_url=image_url,
                    cmc=float(card_data.get("cmc", 0.0) or 0.0),
                    rarity=card_data.get("rarity", "").lower(),
                    colors=colors_str,
                    color_identity=color_id_str,
                    oracle_text=oracle_text or ""
                )
                db.add(card)
            else:
                card.oracle_id = oracle_id or card.oracle_id
                card.name = card_name if card_name != "Desconocido" else card.name
                card.set = set_value or card.set
                card.type_line = card_data.get("type_line", card.type_line)
                card.mana_cost = mana_cost or card.mana_cost
                card.image_url = image_url or card.image_url
                card.cmc = float(card_data.get("cmc", card.cmc) or 0.0)
                card.rarity = card_data.get("rarity", card.rarity)
                card.colors = colors_str or card.colors
                card.color_identity = color_id_str
                card.oracle_text = oracle_text or card.oracle_text

            db.commit()
            db.refresh(card)
            return card
        except Exception as exc:
            db.rollback()
            logger.error(f"Fallo al persistir carta '{card_data.get('name')}' en BD: {exc}")
            return None

    @classmethod
    def fetch_and_store_by_id(cls, db: Session, card_id: str) -> Optional[CartaScryfall]:
        """
        Recupera una carta directamente por su UUID desde la API de Scryfall
        y la guarda en la base de datos local para autorreparar registros incompletos.
        """
        clean_id = card_id.strip()
        if not clean_id:
            return None

        url = f"{SCRYFALL_BASE_URL}/cards/{clean_id}"
        timeout_config = httpx.Timeout(5.0, connect=3.0)

        try:
            with httpx.Client(headers=SCRYFALL_HEADERS, timeout=timeout_config) as client:
                response = client.get(url)
                if response.status_code == 404:
                    logger.warning(f"Carta no encontrada en Scryfall por ID: '{clean_id}'")
                    return None
                response.raise_for_status()
                return cls.upsert_scryfall_card(db, response.json())
        except Exception as exc:
            logger.error(f"Error al sincronizar carta por ID '{clean_id}': {exc}")
            return None

    @classmethod
    def fetch_and_store_by_name(cls, db: Session, card_name: str) -> List[CartaScryfall]:
        """
        Consulta en Scryfall todas las versiones e impresiones (unique=prints) de una carta
        y las sincroniza en la base de datos local.
        """
        clean_name = card_name.strip()
        if not clean_name:
            return []

        url = f"{SCRYFALL_BASE_URL}/cards/search"
        params = {
            "q": f'!"{clean_name}"',
            "unique": "prints",
            "order": "released",
            "dir": "desc"
        }

        timeout_config = httpx.Timeout(6.0, connect=3.0)
        stored_cards: List[CartaScryfall] = []

        try:
            with httpx.Client(headers=SCRYFALL_HEADERS, timeout=timeout_config) as client:
                response = client.get(url, params=params)

                if response.status_code == 404:
                    response = client.get(url, params={"q": clean_name, "unique": "prints"})
                
                if response.status_code == 404:
                    return []

                response.raise_for_status()
                data = response.json()
                card_list = data.get("data", [])

                for item in card_list:
                    c = cls.upsert_scryfall_card(db, item)
                    if c:
                        stored_cards.append(c)

                return stored_cards

        except (httpx.TimeoutException, httpx.RequestError) as net_err:
            logger.warning(f"Timeout o error de red con Scryfall para '{clean_name}': {net_err}")
            return []
        except Exception as err:
            logger.error(f"Error procesando impresiones de Scryfall para '{clean_name}': {err}")
            return []

    @classmethod
    def search_local_catalog(
        cls, 
        db: Session, 
        query: str, 
        limit: int = 30
    ) -> List[CartaScryfall]:
        return (
            db.query(CartaScryfall)
            .filter(CartaScryfall.name.ilike(f"%{query.strip()}%"))
            .limit(limit)
            .all()
        )