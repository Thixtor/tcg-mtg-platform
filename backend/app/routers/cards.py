# ---------------------------------------------------------
# ROUTER DE CATÁLOGO, BUSCADOR AVANZADO Y RECOMENDACIONES
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, defer
from sqlalchemy import and_

from app.database import get_db
from app.models.card import CartaScryfall
from app.schemas.card import CardResponse, SimilarCardsResponse
from app.crud import crud_cards
from app.services.scryfall_query_parser import parse_scryfall_query

router = APIRouter(
    prefix="/cards",
    tags=["Catálogo y Buscador"]
)


# ---------------------------------------------------------
# 1. BÚSQUEDA REACTIVA Y MULTI-FILTRO (SINTAXIS SCRYFALL + UI)
# ---------------------------------------------------------
@router.get(
    "/search",
    response_model=List[CardResponse],
    summary="Buscar cartas con sintaxis Scryfall u operadores visuales combinados"
)
def search_cards(
    q: Optional[str] = Query(
        None, 
        description="Texto libre o sintaxis Scryfall (ej: Sol Ring, t:artifact, mv<=2, f:commander, is:commander)"
    ),
    type: Optional[str] = Query(None, description="Tipo de carta (ej. Creature, Instant, Sorcery, Artifact)"),
    colors: Optional[str] = Query(None, description="Identidad de color separada por coma (ej. W,U o C para incoloro)"),
    rarity: Optional[str] = Query(None, description="Rareza (common, uncommon, rare, mythic)"),
    cmc: Optional[float] = Query(None, ge=0, le=16, description="Coste de maná convertido exacto"),
    limit: int = Query(24, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
):
    """
    Retorna cartas que coincidan con la combinación de filtros solicitada.
    Soporta:
      - Sintaxis Scryfall en 'q' (t:, c:, mv:, r:, s:, o:, f:, is:, etc.)
      - Búsqueda parcial por nombre si se ingresa texto regular
      - Retrocompatibilidad con los filtros UI tradicionales
    """
    # Si no hay criterios de búsqueda, no ejecutamos consulta a base de datos
    if not any([q and q.strip(), type, colors, rarity, cmc is not None]):
        return []

    # Se evita transferir el JSONB scryfall_raw_data para acelerar la respuesta
    query = db.query(CartaScryfall).options(defer(CartaScryfall.scryfall_raw_data))
    conditions = []

    # 1. Procesamiento de sintaxis Scryfall en 'q'
    if q and q.strip():
        conditions.extend(parse_scryfall_query(q.strip()))

    # 2. Integración con selectores tradicionales de la interfaz
    if type and type.lower() != "all":
        conditions.append(CartaScryfall.type_line.ilike(f"%{type.strip()}%"))

    if colors:
        c_upper = colors.strip().upper()
        if c_upper == "C":
            conditions.append(CartaScryfall.colors == "C")
        elif c_upper in ("M", "MULTI", "MULTICOLOR"):
            conditions.append(CartaScryfall.colors.like("%,%"))
        else:
            color_filters = [CartaScryfall.colors.ilike(f"%{c}%") for c in c_upper if c in "WUBRG"]
            if color_filters:
                conditions.append(and_(*color_filters))

    if rarity:
        conditions.append(CartaScryfall.rarity.ilike(rarity.strip().lower()))

    if cmc is not None:
        conditions.append(CartaScryfall.cmc == cmc)

    if conditions:
        query = query.filter(and_(*conditions))

    return query.order_by(CartaScryfall.name.asc()).limit(limit).all()


# ---------------------------------------------------------
# 2. CARTAS FUNCIONALMENTE SIMILARES / SUSTITUTOS DE MAZO
# ---------------------------------------------------------
@router.get(
    "/{card_id}/similar",
    response_model=SimilarCardsResponse,
    summary="Obtener cartas funcionalmente similares o sustitutos de mazo"
)
def get_similar_cards(
    card_id: str,
    limit: int = Query(6, ge=1, le=20, description="Cantidad máxima de cartas similares a retornar"),
    db: Session = Depends(get_db)
):
    resultado = crud_cards.get_similar_cards(db, card_id=card_id, limit=limit)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{card_id}' no fue encontrada para buscar similares."
        )
    return resultado


# ---------------------------------------------------------
# 3. DETALLE ESPECÍFICO DE UNA CARTA
# ---------------------------------------------------------
@router.get(
    "/{card_id}",
    response_model=CardResponse,
    summary="Obtener el detalle completo de una carta"
)
def get_card_by_id(
    card_id: str,
    db: Session = Depends(get_db)
):
    carta = crud_cards.get_card_by_id(db, card_id=card_id)
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{card_id}' no fue encontrada en el catálogo."
        )
    return carta

# ---------------------------------------------------------
# 4. AUTOCOMPLETADO Y SUGERENCIAS EN VIVO (BÚSQUEDA AVANZADA)
# ---------------------------------------------------------
# Lista canónica de palabras clave de MTG (CR 701 & CR 702 / Scryfall)
CANONICAL_KEYWORDS = [
    # Evergreen & Evasión
    "Deathtouch", "Defender", "Double strike", "First strike", "Flash", "Flying", 
    "Haste", "Hexproof", "Indestructible", "Lifelink", "Menace", "Reach", 
    "Trample", "Vigilance", "Ward", "Protection", "Shadow", "Horsemanship",
    # Acciones de palabra clave y activadas
    "Affinity", "Cascade", "Convoke", "Delve", "Dredge", "Escape", "Flashback",
    "Kicker", "Multikicker", "Madness", "Morph", "Megamorph", "Disguise", "Cloak",
    "Ninjutsu", "Sneak", "Storm", "Gravestorm", "Unearth", "Overload", "Replicate",
    "Buyback", "Cycling", "Typecycling", "Transmute", "Evoke", "Prowl", "Dash",
    "Miracle", "Prowess", "Ingest", "Emerge", "Improvise", "Aftermath", "Embalm",
    "Eternalize", "Afflict", "Jump-Start", "Spectacle", "Riot", "Mutate", "Companion",
    "Boast", "Foretell", "Demonstrate", "Disturb", "Decayed", "Cleave", "Training",
    "Blitz", "Casualty", "Enlist", "Read Ahead", "Ravenous", "Squad", "Prototype",
    "Toxic", "Corrupted", "For Mirrodin!", "Bargain", "Craft", "Plot", "Spree",
    "Saddle", "Offspring", "Freerunning", "Gift", "Impending", "Crew", "Reconfigure",
    "Infect", "Wither", "Proliferate", "Amass", "Investigate", "Learn", "Connive"
]

# Cláusulas frecuentes de Oracle Text según el motor de reglas
CANONICAL_ORACLE_CLAUSES = [
    "destroy target creature",
    "destroy target artifact or enchantment",
    "destroy target nonland permanent",
    "destroy all creatures",
    "exile target creature",
    "exile target permanent",
    "exile all creatures",
    "counter target spell",
    "counter target noncreature spell",
    "draw a card",
    "draw two cards",
    "draws a card and you lose 1 life",
    "search your library for a card",
    "search your library for a basic land card",
    "enters the battlefield tapped",
    "when this creature enters",
    "at the beginning of your upkeep",
    "at the beginning of combat on your turn",
    "whenever you cast an instant or sorcery spell",
    "deals damage to any target",
    "target player sacrifices a creature",
    "return target card from your graveyard to your hand",
    "return target permanent to its owner's hand",
    "you may cast this card from your graveyard",
    "create a Treasure token",
    "create a Food token",
    "create a Clue token",
    "create a 1/1 colorless Spirit creature token",
    "put a +1/+1 counter on target creature"
]

@router.get(
    "/autocomplete",
    response_model=List[str],
    summary="Sugerencias de autocompletado para campos de búsqueda avanzada"
)
def autocomplete_field(
    q: str = Query(..., min_length=1, description="Texto parcial ingresado"),
    field: str = Query("name", pattern="^(name|artist|oracle|keyword)$", description="Campo a consultar"),
    limit: int = Query(8, ge=1, le=25),
    db: Session = Depends(get_db)
):
    """
    Retorna sugerencias dinámicas para nombres, artistas, oráculo o palabras clave.
    """
    q_clean = q.strip().lower()
    if not q_clean:
        return []

    # 1. Palabras clave (CR 701 / 702)
    if field == "keyword":
        coincidencias = [kw for kw in CANONICAL_KEYWORDS if q_clean in kw.lower()]
        return coincidencias[:limit]

    # 2. Cláusulas de texto de reglas (Oracle)
    if field == "oracle":
        coincidencias = [cl for cl in CANONICAL_ORACLE_CLAUSES if q_clean in cl.lower()]
        return coincidencias[:limit]

    # 3. Nombres de cartas
    if field == "name":
        if len(q_clean) < 2:
            return []
        results = (
            db.query(CartaScryfall.name)
            .filter(CartaScryfall.name.ilike(f"%{q_clean}%"))
            .distinct()
            .order_by(CartaScryfall.name.asc())
            .limit(limit)
            .all()
        )
        return [r[0] for r in results]

    # 4. Artistas
    if field == "artist":
        if len(q_clean) < 2:
            return []
        results = (
            db.query(CartaScryfall.scryfall_raw_data["artist"].astext)
            .filter(CartaScryfall.scryfall_raw_data["artist"].astext.ilike(f"%{q_clean}%"))
            .distinct()
            .limit(limit)
            .all()
        )
        return [r[0] for r in results if r[0]]

    return []