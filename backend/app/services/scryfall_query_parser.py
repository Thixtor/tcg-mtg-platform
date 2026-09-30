# ---------------------------------------------------------
# SERVICIO TRADUCTOR DE SINTAXIS SCRYFALL A SQL (SQLALCHEMY)
# ---------------------------------------------------------
import re
from typing import List, Any
from sqlalchemy import or_, and_, cast, Integer
from app.models.card import CartaScryfall

# Captura pares operador:valor soportando comillas: ej. o:"destroy all", pow>=4, mv<=3
TOKEN_REGEX = re.compile(
    r'(?P<key>[a-zA-Z]+)(?P<op>[:=<>!]+)(?:"(?P<quoted_val>[^"]+)"|(?P<raw_val>[^\s]+))'
)


def parse_scryfall_query(query_str: str) -> List[Any]:
    """
    Traduce una cadena de búsqueda con sintaxis Scryfall en cláusulas SQLAlchemy.
    Soporta:
      - t: o type: (ej. t:creature, t:artifact)
      - c: o color: (con modificadores de inclusión, exactitud o identidad)
      - mv:, cmc: (operadores =, <=, >=, <, >)
      - pow:, power:, tou:, toughness: (fuerza y resistencia)
      - r: o rarity: (common, uncommon, rare, mythic)
      - s: o set: (código de edición)
      - o: o oracle: (texto de reglas)
      - kw: o keyword: (palabras clave de mecánicas)
      - a: o artist: (ilustrador)
      - f: o format: (legalidad de formatos)
      - is: (is:commander)
      - Palabras libres: Búsqueda difusa en el nombre
    """
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
            filters.append(CartaScryfall.type_line.ilike(f"%{val}%"))

        # 2. Color e Identidad
        elif key in ("c", "color", "colors", "id", "identity"):
            val_upper = val.upper()
            if val_upper == "C":
                filters.append(CartaScryfall.colors == "C")
            elif val_upper in ("M", "MULTI", "MULTICOLOR"):
                filters.append(CartaScryfall.colors.like("%,%"))
            else:
                color_conditions = [CartaScryfall.colors.ilike(f"%{char}%") for char in val_upper if char in "WUBRG"]
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

        # 4. Estadísticas de Combate: Fuerza (Power) y Resistencia (Toughness)
        elif key in ("pow", "power"):
            try:
                pow_val = int(val)
                pow_col = cast(CartaScryfall.scryfall_raw_data["power"].astext, Integer)
                if op in (":", "="):
                    filters.append(pow_col == pow_val)
                elif op == "<=":
                    filters.append(pow_col <= pow_val)
                elif op == ">=":
                    filters.append(pow_col >= pow_val)
                elif op == "<":
                    filters.append(pow_col < pow_val)
                elif op == ">":
                    filters.append(pow_col > pow_val)
            except (ValueError, Exception):
                pass

        elif key in ("tou", "toughness"):
            try:
                tou_val = int(val)
                tou_col = cast(CartaScryfall.scryfall_raw_data["toughness"].astext, Integer)
                if op in (":", "="):
                    filters.append(tou_col == tou_val)
                elif op == "<=":
                    filters.append(tou_col <= tou_val)
                elif op == ">=":
                    filters.append(tou_col >= tou_val)
                elif op == "<":
                    filters.append(tou_col < tou_val)
                elif op == ">":
                    filters.append(tou_col > tou_val)
            except (ValueError, Exception):
                pass

        # 5. Rareza
        elif key in ("r", "rarity"):
            filters.append(CartaScryfall.rarity.ilike(val.lower()))

        # 6. Edición / Código de Set
        elif key in ("s", "set", "e", "edition"):
            filters.append(CartaScryfall.set.ilike(val.lower()))

        # 7. Reglas (Oracle Text) y Palabras Clave (Keywords)
        elif key in ("o", "oracle"):
            filters.append(CartaScryfall.oracle_text.ilike(f"%{val}%"))

        elif key in ("kw", "keyword"):
            filters.append(
                or_(
                    CartaScryfall.oracle_text.ilike(f"%{val}%"),
                    CartaScryfall.scryfall_raw_data["keywords"].astext.ilike(f"%{val}%")
                )
            )

        # 8. Artista / Ilustrador
        elif key in ("a", "artist"):
            filters.append(CartaScryfall.scryfall_raw_data["artist"].astext.ilike(f"%{val}%"))

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
                            CartaScryfall.type_line.ilike("%Legendary%"),
                            CartaScryfall.type_line.ilike("%Creature%")
                        ),
                        CartaScryfall.oracle_text.ilike("%can be your commander%")
                    )
                )

        remaining_text = remaining_text.replace(match.group(0), "")

    # Búsqueda por coincidencia de nombre para los términos sueltos
    clean_name = remaining_text.strip()
    if clean_name:
        filters.append(CartaScryfall.name.ilike(f"%{clean_name}%"))

    return filters