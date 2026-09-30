# app/services/scryfall_query_parser.py
# ---------------------------------------------------------
# SERVICIO TRADUCTOR DE SINTAXIS SCRYFALL A SQL (SQLALCHEMY)
# ---------------------------------------------------------
import re
from typing import List, Any
from sqlalchemy import or_, and_, cast, Integer

from app.models.card import CartaScryfall
from app.crud.crud_cards import escape_like

TOKEN_REGEX = re.compile(
    r'(?P<key>[a-zA-Z]+)(?P<op>[:=<>!]+)(?:"(?P<quoted_val>[^"]+)"|(?P<raw_val>[^\s]+))'
)

def _build_safe_stat_filter(stat_field: str, op: str, val_str: str):
    """
    Construye filtros numéricos para stats (pow/tou) protegiendo contra
    valores no enteros de MTG (*, 1+*, X, ?) que rompen CAST() en PostgreSQL.
    """
    col_as_text = CartaScryfall.scryfall_raw_data[stat_field].astext
    
    # Si el valor buscado es puramente numérico (ej. pow>=4)
    if re.match(r"^-?\d+$", val_str):
        int_val = int(val_str)
        # Validación regex en base de datos: solo aplicar cast si el campo en la fila es un entero
        is_numeric = col_as_text.op("~")(r"^-?[0-9]+$")
        casted_col = cast(col_as_text, Integer)
        
        if op in (":", "="):
            return and_(is_numeric, casted_col == int_val)
        elif op == "<=":
            return and_(is_numeric, casted_col <= int_val)
        elif op == ">=":
            return and_(is_numeric, casted_col >= int_val)
        elif op == "<":
            return and_(is_numeric, casted_col < int_val)
        elif op == ">":
            return and_(is_numeric, casted_col > int_val)
        elif op == "!=":
            return or_(~is_numeric, casted_col != int_val)
            
    # Si buscan valores simbólicos como pow:* o tou:X, comparar como cadena literal
    return col_as_text == val_str


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

        # 4. Estadísticas de Combate (Fuerza y Resistencia Seguras)
        elif key in ("pow", "power"):
            condition = _build_safe_stat_filter("power", op, val)
            if condition is not None:
                filters.append(condition)

        elif key in ("tou", "toughness"):
            condition = _build_safe_stat_filter("toughness", op, val)
            if condition is not None:
                filters.append(condition)

        # 5. Rareza
        elif key in ("r", "rarity"):
            filters.append(CartaScryfall.rarity.ilike(escape_like(val.lower()), escape="\\"))

        # 6. Edición / Código de Set
        elif key in ("s", "set", "e", "edition"):
            filters.append(CartaScryfall.set.ilike(escape_like(val.lower()), escape="\\"))

        # 7. Reglas (Oracle Text) y Palabras Clave (Keywords)
        elif key in ("o", "oracle"):
            filters.append(CartaScryfall.oracle_text.ilike(f"%{escape_like(val)}%", escape="\\"))

        elif key in ("kw", "keyword"):
            filters.append(
                or_(
                    CartaScryfall.oracle_text.ilike(f"%{escape_like(val)}%", escape="\\"),
                    CartaScryfall.scryfall_raw_data["keywords"].astext.ilike(f"%{escape_like(val)}%", escape="\\")
                )
            )

        # 8. Artista / Ilustrador
        elif key in ("a", "artist"):
            filters.append(CartaScryfall.scryfall_raw_data["artist"].astext.ilike(f"%{escape_like(val)}%", escape="\\"))

        # 9. Formato Legal
        elif key in ("f", "format", "legal"):
            format_key = val.lower()
            filters.append(
                CartaScryfall.scryfall_raw_data["legalities"][format_key].astext == "legal"
            )

        # 10. Banderas Especiales
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

    # Búsqueda por nombre en términos restantes
    clean_name = remaining_text.strip()
    if clean_name:
        filters.append(CartaScryfall.name.ilike(f"%{escape_like(clean_name)}%", escape="\\"))

    return filters