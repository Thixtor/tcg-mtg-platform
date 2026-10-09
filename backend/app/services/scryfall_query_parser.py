# app/services/scryfall_query_parser.py
# ---------------------------------------------------------
# SERVICIO TRADUCTOR DE SINTAXIS SCRYFALL A SQL (SQLALCHEMY)
# ---------------------------------------------------------
import re
from typing import List, Any
from sqlalchemy import or_, and_

from app.models.card import CartaScryfall
from app.repositories.card_repository import escape_like

TOKEN_REGEX = re.compile(
    r'(?P<key>[a-zA-Z]+)(?P<op>[:=<>!]+)(?:"(?P<quoted_val>[^"]+)"|(?P<raw_val>[^\s]+))'
)


def parse_scryfall_query(query_str: str) -> List[Any]:
    if not query_str:
        return []

    filters = []
    remaining_text = query_str

    for match in TOKEN_REGEX.finditer(query_str):
        key = match.group("key").lower()
        op = match.group("op")
        val = match.group("quoted_val") or match.group("raw_val") or ""
        val = val.strip()

        # Omitir 'order:' o 'sort:' para que no se interpreten como nombre de carta
        if key in ("order", "sort"):
            remaining_text = remaining_text.replace(match.group(0), "")
            continue

        # 1. Tipo y Subtipo de carta
        if key in ("t", "type"):
            filters.append(CartaScryfall.type_line.ilike(f"%{escape_like(val)}%", escape="\\"))

        # 2. Color e Identidad
        elif key in ("c", "color", "colors", "id", "identity"):
            val_upper = val.upper()
            if val_upper == "C":
                filters.append(CartaScryfall.colors == "C")
            elif val_upper in ("M", "MULTI", "MULTICOLOR"):
                filters.append(CartaScryfall.colors.like("%,%"))
            else:
                color_conditions = [CartaScryfall.colors.ilike(f"%{c}%", escape="\\") for c in val_upper if c in "WUBRG"]
                if color_conditions:
                    filters.append(and_(*color_conditions))

        # 3. Coste de Maná Convertido (CMC / Mana Value)
        elif key in ("mv", "cmc", "manavalue"):
            try:
                cmc_val = float(val)
                if op in (":", "="):
                    filters.append(CartaScryfall.cmc == cmc_val)
                elif op == "<=":
                    filters.append(CartaScryfall.cmc <= cmc_val)
                elif op == ">=":
                    filters.append(CartaScryfall.cmc >= cmc_val)
                elif op == "<":
                    filters.append(CartaScryfall.cmc < cmc_val)
                elif op == ">":
                    filters.append(CartaScryfall.cmc > cmc_val)
            except ValueError:
                pass

        # 4. Rareza
        elif key in ("r", "rarity"):
            filters.append(CartaScryfall.rarity.ilike(escape_like(val.lower()), escape="\\"))

        # 5. Edición / Código de Set
        elif key in ("s", "set", "e", "edition"):
            filters.append(CartaScryfall.set.ilike(escape_like(val.lower()), escape="\\"))

        # 6. Reglas (Oracle Text) y Palabras Clave
        elif key in ("o", "oracle", "kw", "keyword"):
            filters.append(CartaScryfall.oracle_text.ilike(f"%{escape_like(val)}%", escape="\\"))

        # 7. Banderas Especiales (ej. is:commander)
        elif key == "is":
            if val.lower() == "commander":
                filters.append(
                    or_(
                        and_(
                            CartaScryfall.type_line.ilike("%Legendary%", escape="\\"),
                            CartaScryfall.type_line.ilike("%Creature%", escape="\\")
                        ),
                        CartaScryfall.oracle_text.ilike("%can be your commander%", escape="\\")
                    )
                )

        remaining_text = remaining_text.replace(match.group(0), "")

    clean_name = remaining_text.strip()
    if clean_name:
        filters.append(CartaScryfall.name.ilike(f"%{escape_like(clean_name)}%", escape="\\"))

    return filters