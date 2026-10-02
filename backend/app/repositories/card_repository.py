# app/repositories/card_repository.py
# ---------------------------------------------------------
# REPOSITORIO DE DOMINIO: CONSULTAS Y REGLAS DE CATÁLOGO MTG
# ---------------------------------------------------------
import re
from typing import List, Optional, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.card import CartaScryfall

MECHANIC_RULES = [
    {
        "id": "counterspell",
        "role": "Counterspell (Interrupción)",
        "test": lambda text: bool(re.search(r"\bcounter target\b|\bcounter that spell\b", text, re.IGNORECASE))
    },
    {
        "id": "board_wipe",
        "role": "Board Wipe (Limpieza masiva)",
        "test": lambda text: bool(re.search(r"\b(destroy all|exile all|all creatures get -)\b", text, re.IGNORECASE))
    },
    {
        "id": "targeted_removal",
        "role": "Removal Puntual",
        "test": lambda text: bool(re.search(r"\b(destroy|exile) target\b", text, re.IGNORECASE)) and not bool(re.search(r"\b(destroy all|exile all)\b", text, re.IGNORECASE))
    },
    {
        "id": "plus_counters",
        "role": "Sinergia de Contadores (+1/+1)",
        "test": lambda text: bool(re.search(r"(\+1/\+1 counter|\bput a .* counter on\b|\bwith .* counter\b)", text, re.IGNORECASE))
    },
    {
        "id": "lifegain",
        "role": "Ganancia de Vidas",
        "test": lambda text: bool(re.search(r"\b(gain(s)? \d+ life|lifelink|whenever you gain life)\b", text, re.IGNORECASE))
    },
    {
        "id": "ramp",
        "role": "Ramp / Aceleración de Maná",
        "test": lambda text: bool(re.search(r"(\{T\}: add|search your library for a (basic )?land)", text, re.IGNORECASE))
    },
    {
        "id": "card_draw",
        "role": "Ventaja de Cartas / Robo",
        "test": lambda text: bool(re.search(r"\bdraw (a|two|three|\d+) card(s)?\b", text, re.IGNORECASE))
    },
    {
        "id": "tutor",
        "role": "Tutor (Búsqueda)",
        "test": lambda text: bool(re.search(r"\bsearch your library for a .* card and put\b", text, re.IGNORECASE))
    },
    {
        "id": "burn",
        "role": "Daño Directo (Burn)",
        "test": lambda text: bool(re.search(r"\bdeal(s)? \d+ damage\b", text, re.IGNORECASE))
    }
]


def escape_like(s: str) -> str:
    """Escapa comodines % y _ para prevenir comportamientos inesperados en LIKE."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def extract_oracle_text(raw_data: Optional[dict]) -> str:
    if not raw_data:
        return ""
    if raw_data.get("oracle_text"):
        return raw_data["oracle_text"]
    if "card_faces" in raw_data and isinstance(raw_data["card_faces"], list):
        return " // ".join(face.get("oracle_text", "") for face in raw_data["card_faces"] if face.get("oracle_text"))
    return ""


def get_mechanic_ids(oracle_text: Optional[str]) -> Set[str]:
    text = oracle_text or ""
    return {rule["id"] for rule in MECHANIC_RULES if rule["test"](text)}


def get_primary_role_label(oracle_text: Optional[str], type_line: Optional[str]) -> str:
    text = oracle_text or ""
    for rule in MECHANIC_RULES:
        if rule["test"](text):
            return rule["role"]

    if type_line and "—" in type_line:
        primary_type = type_line.split("—")[0].strip()
    elif type_line:
        primary_type = type_line.strip()
    else:
        primary_type = "Carta"
    return f"Sinergia de {primary_type}"


class CardRepository:
    """
    Repositorio de persistencia y análisis semántico para el catálogo Scryfall.
    """

    @staticmethod
    def get_by_id(db: Session, card_id: str) -> Optional[CartaScryfall]:
        return db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()

    @staticmethod
    def score_candidate(base_data: dict, cand_data: dict, base_mechanics: Set[str]) -> int:
        score = 10
        cand_text = cand_data.get("oracle_text", "")
        cand_mechanics = get_mechanic_ids(cand_text)

        shared_mechanics = base_mechanics.intersection(cand_mechanics)
        if shared_mechanics:
            score += 45
        else:
            if ("counterspell" in base_mechanics and "plus_counters" in cand_mechanics) or \
               ("plus_counters" in base_mechanics and "counterspell" in cand_mechanics):
                score -= 30
            elif "lifegain" in base_mechanics and "burn" in cand_mechanics:
                score -= 15

        base_cmc = float(base_data.get("cmc") or 0.0)
        cand_cmc = float(cand_data.get("cmc") or 0.0)
        diff = abs(base_cmc - cand_cmc)
        if diff == 0:
            score += 25
        elif diff <= 1:
            score += 18
        elif diff <= 2:
            score += 10
        elif diff <= 3:
            score += 5

        base_tl = base_data.get("type_line") or ""
        cand_tl = cand_data.get("type_line") or ""
        base_primary = base_tl.split("—")[0].strip() if base_tl else ""
        cand_primary = cand_tl.split("—")[0].strip() if cand_tl else ""

        if base_primary and base_primary == cand_primary:
            score += 15

        return max(5, min(score, 100))

    @classmethod
    def get_similar_cards(cls, db: Session, card_id: str, limit: int = 6) -> Optional[Dict[str, Any]]:
        base_card = cls.get_by_id(db, card_id)
        if not base_card:
            return None

        raw_base = base_card.scryfall_raw_data or {}
        base_oracle = base_card.oracle_text or extract_oracle_text(raw_base)
        base_mechanics = get_mechanic_ids(base_oracle)
        role_label = get_primary_role_label(base_oracle, base_card.type_line)

        type_line_str = base_card.type_line or ""
        base_primary_type = type_line_str.split("—")[0].replace("Legendary", "").replace("Snow", "").strip()
        base_cmc = base_card.cmc or 0.0

        query = (
            db.query(CartaScryfall)
            .filter(
                CartaScryfall.id != base_card.id,
                CartaScryfall.name != base_card.name,
                CartaScryfall.cmc.between(max(0.0, base_cmc - 2.0), base_cmc + 2.0)
            )
        )

        if base_primary_type:
            query = query.filter(CartaScryfall.type_line.ilike(f"%{escape_like(base_primary_type)}%", escape="\\"))

        candidates = (
            query.order_by(func.abs(CartaScryfall.cmc - base_cmc).asc())
            .limit(100)
            .all()
        )

        scored_candidates = []
        base_data = {
            "oracle_text": base_oracle,
            "type_line": base_card.type_line,
            "cmc": base_cmc
        }

        for cand in candidates:
            cand_raw = cand.scryfall_raw_data or {}
            cand_data = {
                "oracle_text": cand.oracle_text or extract_oracle_text(cand_raw),
                "type_line": cand.type_line,
                "cmc": cand.cmc
            }

            score = cls.score_candidate(base_data, cand_data, base_mechanics)
            prices = cand_raw.get("prices", {})
            price_val = float(prices.get("usd") or prices.get("usd_foil") or 0.0) if (prices.get("usd") or prices.get("usd_foil")) else None

            scored_candidates.append({
                "card": {
                    "id": cand.id,
                    "name": cand.name,
                    "mana_cost": cand.mana_cost,
                    "type_line": cand.type_line,
                    "image_url": cand.image_url,
                    "rarity": cand.rarity or "common",
                    "set": (cand.set or "").upper(),
                    "similarity_reason": f"{role_label} ({score}% afín)",
                    "current_price_usd": price_val
                },
                "score": score
            })

        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        top_similar = [item["card"] for item in scored_candidates[:limit]]

        return {
            "base_card_id": base_card.id,
            "base_card_name": base_card.name,
            "matched_role": role_label,
            "similar_cards": top_similar
        }