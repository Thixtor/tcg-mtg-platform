# app/routers/cards.py
# ---------------------------------------------------------
# ROUTER DE CATÁLOGO, BUSCADOR AVANZADO Y RECOMENDACIONES
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, defer
from sqlalchemy import and_

from app.database import get_db
from app.models.card import CartaScryfall
from app.schemas.card import CardSummary, CardDetail, SimilarCardsResponse
from app.crud import crud_cards
from app.crud.crud_cards import escape_like
from app.services.scryfall_query_parser import parse_scryfall_query

router = APIRouter(
    prefix="/cards",
    tags=["Catálogo y Buscador"]
)

CANONICAL_KEYWORDS = [
    "Deathtouch", "Defender", "Double strike", "First strike", "Flash", "Flying", 
    "Haste", "Hexproof", "Indestructible", "Lifelink", "Menace", "Reach", 
    "Trample", "Vigilance", "Ward", "Protection", "Shadow", "Horsemanship",
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

CANONICAL_ORACLE_CLAUSES = [
    "destroy target creature", "destroy target artifact or enchantment",
    "destroy target nonland permanent", "destroy all creatures", "exile target creature",
    "exile target permanent", "exile all creatures", "counter target spell",
    "counter target noncreature spell", "draw a card", "draw two cards",
    "draws a card and you lose 1 life", "search your library for a card",
    "search your library for a basic land card", "enters the battlefield tapped",
    "when this creature enters", "at the beginning of your upkeep",
    "at the beginning of combat on your turn", "whenever you cast an instant or sorcery spell",
    "deals damage to any target", "target player sacrifices a creature",
    "return target card from your graveyard to your hand", "return target permanent to its owner's hand",
    "you may cast this card from your graveyard", "create a Treasure token",
    "create a Food token", "create a Clue token", "create a 1/1 colorless Spirit creature token",
    "put a +1/+1 counter on target creature"
]


# ---------------------------------------------------------
# 1. BÚSQUEDA REACTIVA Y MULTI-FILTRO (LIGERA: CardSummary)
# ---------------------------------------------------------
@router.get(
    "/search",
    response_model=List[CardSummary],
    summary="Buscar cartas con sintaxis Scryfall u operadores visuales combinados"
)
def search_cards(
    q: Optional[str] = Query(
        None,
        max_length=200,
        description="Texto libre o sintaxis Scryfall (ej: Sol Ring, t:artifact, mv<=2, f:commander)"
    ),
    type: Optional[str] = Query(None, max_length=50, description="Tipo de carta (ej. Creature, Instant)"),
    colors: Optional[str] = Query(None, max_length=20, description="Identidad de color separada por coma"),
    rarity: Optional[str] = Query(None, max_length=20, description="Rareza (common, uncommon, rare, mythic)"),
    cmc: Optional[float] = Query(None, ge=0, le=16, description="Coste de maná convertido exacto"),
    limit: int = Query(24, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
):
    if not any([q and q.strip(), type, colors, rarity, cmc is not None]):
        return []

    # Al usar CardSummary como response_model, defer() elimina efectivamente el N+1 y no transfiere el JSONB
    query = db.query(CartaScryfall).options(defer(CartaScryfall.scryfall_raw_data))
    conditions = []

    if q and q.strip():
        conditions.extend(parse_scryfall_query(q.strip()))

    if type and type.lower() != "all":
        conditions.append(CartaScryfall.type_line.ilike(f"%{escape_like(type.strip())}%", escape="\\"))

    if colors:
        c_upper = colors.strip().upper()
        if c_upper == "C":
            conditions.append(CartaScryfall.colors == "C")
        elif c_upper in ("M", "MULTI", "MULTICOLOR"):
            conditions.append(CartaScryfall.colors.like("%,%"))
        else:
            color_filters = [CartaScryfall.colors.ilike(f"%{c}%", escape="\\") for c in c_upper if c in "WUBRG"]
            if color_filters:
                conditions.append(and_(*color_filters))

    if rarity:
        conditions.append(CartaScryfall.rarity.ilike(escape_like(rarity.strip().lower()), escape="\\"))

    if cmc is not None:
        conditions.append(CartaScryfall.cmc == cmc)

    if conditions:
        query = query.filter(and_(*conditions))

    return query.order_by(CartaScryfall.name.asc()).limit(limit).all()


# ---------------------------------------------------------
# 2. AUTOCOMPLETADO (COLOCADO ANTES DE /{card_id} PARA EVITAR 404)
# ---------------------------------------------------------
@router.get(
    "/autocomplete",
    response_model=List[str],
    summary="Sugerencias de autocompletado para campos de búsqueda avanzada"
)
def autocomplete_field(
    q: str = Query(..., min_length=1, max_length=100, description="Texto parcial ingresado"),
    field: str = Query("name", pattern="^(name|artist|oracle|keyword)$", description="Campo a consultar"),
    limit: int = Query(8, ge=1, le=25),
    db: Session = Depends(get_db)
):
    q_clean = q.strip().lower()
    if not q_clean:
        return []

    if field == "keyword":
        return [kw for kw in CANONICAL_KEYWORDS if q_clean in kw.lower()][:limit]

    if field == "oracle":
        return [cl for cl in CANONICAL_ORACLE_CLAUSES if q_clean in cl.lower()][:limit]

    if field == "name":
        if len(q_clean) < 2:
            return []
        safe_q = escape_like(q_clean)
        results = (
            db.query(CartaScryfall.name)
            .filter(CartaScryfall.name.ilike(f"%{safe_q}%", escape="\\"))
            .distinct()
            .order_by(CartaScryfall.name.asc())
            .limit(limit)
            .all()
        )
        return [r[0] for r in results]

    if field == "artist":
        if len(q_clean) < 2:
            return []
        safe_q = escape_like(q_clean)
        results = (
            db.query(CartaScryfall.scryfall_raw_data["artist"].astext)
            .filter(CartaScryfall.scryfall_raw_data["artist"].astext.ilike(f"%{safe_q}%", escape="\\"))
            .distinct()
            .limit(limit)
            .all()
        )
        return [r[0] for r in results if r[0]]

    return []


# ---------------------------------------------------------
# 3. CARTAS SIMILARES
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
# 4. DETALLE COMPLETO (SOLO AQUÍ SE RETORNA CardDetail con JSONB)
# ---------------------------------------------------------
@router.get(
    "/{card_id}",
    response_model=CardDetail,
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