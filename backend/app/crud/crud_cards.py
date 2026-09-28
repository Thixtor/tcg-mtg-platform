# ---------------------------------------------------------
# OPERACIONES CRUD: CATÁLOGO, BUSCADOR AVANZADO Y SIMILARES
# ---------------------------------------------------------
import re
from typing import List, Optional, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, Float, String
from app.models.card import CartaScryfall

# ---------------------------------------------------------
# DICCIONARIO SEMÁNTICO DE MECÁNICAS PRECISAS MTG
# ---------------------------------------------------------
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

def extract_oracle_text(raw_data: dict) -> str:
    """Extrae el texto de reglas considerando cartas estándar y de doble cara."""
    if not raw_data:
        return ""
    if raw_data.get("oracle_text"):
        return raw_data["oracle_text"]
    if "card_faces" in raw_data and isinstance(raw_data["card_faces"], list):
        return " // ".join(face.get("oracle_text", "") for face in raw_data["card_faces"] if face.get("oracle_text"))
    return ""

def get_mechanic_ids(oracle_text: str) -> Set[str]:
    text = oracle_text or ""
    return {rule["id"] for rule in MECHANIC_RULES if rule["test"](text)}

def get_primary_role_label(oracle_text: str, type_line: str) -> str:
    text = oracle_text or ""
    for rule in MECHANIC_RULES:
        if rule["test"](text):
            return rule["role"]
    primary_type = type_line.split("—")[0].strip() if type_line else "Carta"
    return f"Sinergia de {primary_type}"


# ---------------------------------------------------------
# 1. BÚSQUEDA AVANZADA CON FILTROS COMBINADOS (SQL DINÁMICO)
# ---------------------------------------------------------
def search_cards_advanced(
    db: Session,
    query_text: Optional[str] = None,
    card_type: Optional[str] = None,
    colors: Optional[str] = None,
    rarity: Optional[str] = None,
    cmc: Optional[int] = None,
    limit: int = 24
) -> List[CartaScryfall]:
    """
    Realiza una búsqueda dinámica combinando filtros por nombre, tipo,
    color, rareza y CMC sobre el catálogo local.
    """
    query = db.query(CartaScryfall)

    # 1.1 Filtro por nombre
    if query_text and query_text.strip():
        query = query.filter(CartaScryfall.name.ilike(f"%{query_text.strip()}%"))

    # 1.2 Filtro por tipo de carta (CORREGIDO: Desindentado del bloque query_text)
    if card_type and card_type.strip() and card_type.lower() != 'all':
        query = query.filter(CartaScryfall.type_line.ilike(f"%{card_type.strip()}%"))

    # 1.3 Filtro por colores / identidad
    if colors and colors.strip():
        color_list = [c.strip().upper() for c in colors.split(",") if c.strip()]
        
        if "C" in color_list:
            query = query.filter(
                or_(
                    cast(CartaScryfall.scryfall_raw_data['color_identity'], String) == '[]',
                    cast(CartaScryfall.scryfall_raw_data['colors'], String) == '[]',
                    CartaScryfall.scryfall_raw_data['color_identity'] == None
                )
            )
        else:
            for col in color_list:
                query = query.filter(
                    or_(
                        cast(CartaScryfall.scryfall_raw_data['color_identity'], String).ilike(f'%"{col}"%'),
                        cast(CartaScryfall.scryfall_raw_data['colors'], String).ilike(f'%"{col}"%')
                    )
                )

    # 1.4 Filtro por rareza (CORREGIDO: cast a String compatible y agnóstico)
    if rarity and rarity.strip():
        query = query.filter(
            cast(CartaScryfall.scryfall_raw_data['rarity'].as_string(), String).ilike(rarity.strip().lower())
        )

    # 1.5 Filtro por CMC (CORREGIDO: cast a Float vía as_string)
    if cmc is not None:
        cmc_expr = cast(CartaScryfall.scryfall_raw_data['cmc'].as_string(), Float)
        if cmc >= 6:
            query = query.filter(cmc_expr >= 6.0)
        else:
            query = query.filter(cmc_expr == float(cmc))

    return query.order_by(CartaScryfall.name.asc()).limit(limit).all()


def search_cards_by_name(db: Session, query_text: str, limit: int = 20) -> List[CartaScryfall]:
    return search_cards_advanced(db, query_text=query_text, limit=limit)


# ---------------------------------------------------------
# 2. OBTENER CARTA POR ID
# ---------------------------------------------------------
def get_card_by_id(db: Session, card_id: str) -> Optional[CartaScryfall]:
    return db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()


# ---------------------------------------------------------
# 3. MOTOR DE SIMILITUD DE CARTAS
# ---------------------------------------------------------
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
        elif ("lifegain" in base_mechanics and "burn" in cand_mechanics):
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

    base_primary = base_data.get("type_line", "").split("—")[0].strip()
    cand_primary = cand_data.get("type_line", "").split("—")[0].strip()
    if base_primary and base_primary == cand_primary:
        score += 15
    elif any(t in cand_primary for t in base_primary.split() if t not in ["Legendary", "Basic", "Snow"]):
        score += 8

    if "—" in base_data.get("type_line", "") and "—" in cand_data.get("type_line", ""):
        base_subs = set(base_data.get("type_line", "").split("—")[1].strip().split())
        cand_subs = set(cand_data.get("type_line", "").split("—")[1].strip().split())
        if base_subs.intersection(cand_subs):
            score += 5

    base_ci = set(base_data.get("color_identity", []))
    cand_ci = set(cand_data.get("color_identity", []))
    if base_ci == cand_ci:
        score += 10
    elif cand_ci.issubset(base_ci) or not cand_ci:
        score += 6

    return max(5, min(score, 100))


def get_similar_cards(db: Session, card_id: str, limit: int = 6) -> Optional[Dict[str, Any]]:
    base_card = get_card_by_id(db, card_id)
    if not base_card:
        return None

    raw_base = base_card.scryfall_raw_data or {}
    base_oracle = extract_oracle_text(raw_base)

    base_data = {
        "oracle_text": base_oracle,
        "type_line": base_card.type_line or raw_base.get("type_line", ""),
        "cmc": raw_base.get("cmc", 0.0),
        "color_identity": raw_base.get("color_identity", [])
    }
    color_identity = set(base_data["color_identity"])

    base_mechanics = get_mechanic_ids(base_data["oracle_text"])
    role_label = get_primary_role_label(base_data["oracle_text"], base_data["type_line"])
    base_primary_type = base_data["type_line"].split("—")[0].replace("Legendary", "").replace("Snow", "").strip()

    # Búsqueda determinista con ORDER BY
    candidates = (
        db.query(CartaScryfall)
        .filter(
            CartaScryfall.id != base_card.id,
            CartaScryfall.name != base_card.name,
            CartaScryfall.type_line.ilike(f"%{base_primary_type}%")
        )
        .order_by(CartaScryfall.name.asc())
        .limit(100)
        .all()
    )

    if len(candidates) < limit:
        extra_query = (
            db.query(CartaScryfall)
            .filter(
                CartaScryfall.id != base_card.id,
                CartaScryfall.name != base_card.name
            )
            .order_by(CartaScryfall.name.asc())
            .limit(100)
            .all()
        )
        candidates = list({c.id: c for c in (candidates + extra_query)}.values())

    scored_candidates = []
    for cand in candidates:
        cand_raw = cand.scryfall_raw_data or {}
        cand_ci = set(cand_raw.get("color_identity", []))

        if color_identity:
            if not cand_ci.issubset(color_identity) and cand_ci != color_identity:
                continue
        else:
            if cand_ci:
                continue

        cand_data = {
            "oracle_text": extract_oracle_text(cand_raw),
            "type_line": cand.type_line or cand_raw.get("type_line", ""),
            "cmc": cand_raw.get("cmc", 0.0),
            "color_identity": cand_raw.get("color_identity", [])
        }

        score = score_candidate(base_data, cand_data, base_mechanics)

        prices = cand_raw.get("prices", {})
        price_val = float(prices.get("usd") or prices.get("usd_foil") or 0.0) if (prices.get("usd") or prices.get("usd_foil")) else None

        scored_candidates.append({
            "card": {
                "id": cand.id,
                "name": cand.name,
                "mana_cost": cand.mana_cost or cand_raw.get("mana_cost"),
                "type_line": cand.type_line or cand_raw.get("type_line"),
                "image_url": cand.image_url or cand_raw.get("image_uris", {}).get("normal"),
                "rarity": cand_raw.get("rarity", "common"),
                "set": cand.set or cand_raw.get("set", "").upper(),
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