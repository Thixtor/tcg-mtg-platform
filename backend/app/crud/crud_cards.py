# ---------------------------------------------------------
# DETECCIÓN DE ROLES Y BÚSQUEDA DE CARTAS SIMILARES
# ---------------------------------------------------------
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, not_
from app.models.card import CartaScryfall
# Si tienes modelo de precios, se puede importar para traer el último precio; si no, se extrae del raw_data
import re

# Diccionario de arquetipos funcionales de MTG
FUNCTIONAL_PATTERNS = [
    {
        "role": "Board Wipe (Limpieza de mesa)",
        "pattern": r"(destroy all|exile all|all creatures get -)",
        "types": ["Sorcery", "Instant"]
    },
    {
        "role": "Counterspell (Contrarrestar hechizos)",
        "pattern": r"counter target",
        "types": ["Instant"]
    },
    {
        "role": "Targeted Removal (Eliminación puntual)",
        "pattern": r"(destroy target|exile target)",
        "types": ["Instant", "Sorcery"]
    },
    {
        "role": "Ramp / Aceleración de Maná",
        "pattern": r"(\{T\}: add|search your library for a (basic )?land)",
        "types": ["Artifact", "Sorcery", "Creature"]
    },
    {
        "role": "Ventaja de Cartas / Robo",
        "pattern": r"draw (a|two|three|\d+) card",
        "types": ["Instant", "Sorcery", "Enchantment"]
    },
    {
        "role": "Tutor (Búsqueda específica)",
        "pattern": r"search your library for a .* card and put",
        "types": ["Sorcery", "Instant"]
    }
]

def detect_card_role(oracle_text: str, type_line: str) -> dict:
    text_lower = (oracle_text or "").lower()
    for item in FUNCTIONAL_PATTERNS:
        if re.search(item["pattern"], text_lower, re.IGNORECASE):
            return item
    # Fallback por tipo principal
    primary_type = type_line.split("—")[0].strip() if type_line else "Carta"
    return {"role": f"Arquetipo similar ({primary_type})", "pattern": None, "types": [primary_type]}

def get_similar_cards(db: Session, card_id: str, limit: int = 6):
    base_card = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not base_card:
        return None

    raw = base_card.scryfall_raw_data or {}
    oracle_text = raw.get("oracle_text", "")
    type_line = base_card.type_line or raw.get("type_line", "")
    color_identity = set(raw.get("color_identity", []))

    role_info = detect_card_role(oracle_text, type_line)
    role_name = role_info["role"]
    pattern = role_info["pattern"]

    query = db.query(CartaScryfall).filter(
        CartaScryfall.id != base_card.id,
        CartaScryfall.name != base_card.name  # Evitar reimpresiones de la misma carta
    )

    # 1. Filtro por patrón mecánico si existe
    if pattern:
        # PostgreSQL regexp o ILIKE
        regex_keyword = pattern.split("|")[0].replace("(", "").replace(")", "")
        query = query.filter(CartaScryfall.scryfall_raw_data['oracle_text'].astext.ilike(f"%{regex_keyword}%"))
    else:
        # Si no hay patrón puntual, buscamos mismo supertipo principal
        primary_type = type_line.split("—")[0].strip()
        query = query.filter(CartaScryfall.type_line.ilike(f"%{primary_type}%"))

    candidates = query.limit(limit * 3).all()

    # 2. Filtrar por compatibilidad de color (no agregar colores ajenos)
    similar_list = []
    for cand in candidates:
        cand_raw = cand.scryfall_raw_data or {}
        cand_ci = set(cand_raw.get("color_identity", []))
        
        # Debe ser subconjunto de la identidad original (o incolora) si la base tiene color
        if color_identity:
            if not cand_ci.issubset(color_identity) and cand_ci != color_identity:
                continue
        else:
            # Si la carta base es incolora, preferir incoloras
            if cand_ci:
                continue

        # Extraer precio de referencia (TCGplayer o Card Kingdom)
        prices = cand_raw.get("prices", {})
        price_val = float(prices.get("usd") or prices.get("usd_foil") or 0.0) if (prices.get("usd") or prices.get("usd_foil")) else None

        similar_list.append({
            "id": cand.id,
            "name": cand.name,
            "mana_cost": cand.mana_cost or cand_raw.get("mana_cost"),
            "type_line": cand.type_line or cand_raw.get("type_line"),
            "image_url": cand.image_url or cand_raw.get("image_uris", {}).get("normal"),
            "rarity": cand_raw.get("rarity", "common"),
            "set": cand.set or cand_raw.get("set", "").upper(),
            "similarity_reason": role_name,
            "current_price_usd": price_val
        })

        if len(similar_list) >= limit:
            break

    return {
        "base_card_id": base_card.id,
        "base_card_name": base_card.name,
        "matched_role": role_name,
        "similar_cards": similar_list
    }