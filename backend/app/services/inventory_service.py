from typing import List, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import Deck, DeckCard, UserCard, Collection
from app.schemas import DeckCardDetailResponse


# ---------------------------------------------------------
# SERVICIO DE ANÁLISIS DE DISPONIBILIDAD DE INVENTARIO
# ---------------------------------------------------------
def calculate_deck_availability(db: Session, deck: Deck) -> List[DeckCardDetailResponse]:
    """
    Evalúa la disponibilidad física de las cartas requeridas por un mazo
    considerando cantidades numéricas reales:
    - DISPONIBLE: Las copias totales en posesión menos las asignadas a otros mazos
      cubren la cantidad exigida por este mazo.
    - EN_OTRO_MAZO: El usuario posee copias suficientes, pero están ocupadas en otros mazos.
    - FALTANTE: El usuario no cuenta con copias suficientes en ninguna colección.
    """
    user_id: str = str(deck.user_id)

    # 1. Cargar las cartas del mazo actual evitando N+1
    cartas_mazo: List[DeckCard] = (
        db.query(DeckCard)
        .options(joinedload(DeckCard.card_catalog))
        .filter(DeckCard.deck_id == deck.id)
        .all()
    )

    if not cartas_mazo:
        return []

    # 2. Cantidad total poseída por cada carta en todas las colecciones del usuario
    owned_query = (
        db.query(
            UserCard.scryfall_card_id, 
            func.coalesce(func.sum(UserCard.quantity), 0)
        )
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id)
        .group_by(UserCard.scryfall_card_id)
        .all()
    )
    # Extraemos por índice para evitar errores si la tupla tiene 2 o más elementos
    total_poseidas: Dict[str, int] = {
        row[0]: int(row[1]) for row in owned_query
    }

    # 3. Cantidad comprometida en otros mazos del mismo usuario
    used_query = (
        db.query(
            DeckCard.scryfall_card_id, 
            func.coalesce(func.sum(DeckCard.quantity), 0)
        )
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(
            Deck.user_id == user_id, 
            Deck.id != deck.id,
            DeckCard.category.in_(["mainboard", "commander", "sideboard"])
        )
        .group_by(DeckCard.scryfall_card_id)
        .all()
    )
    usadas_otros_mazos: Dict[str, int] = {
        row[0]: int(row[1]) for row in used_query
    }

    # 4. Detalle de nombres de otros mazos donde aparece cada carta
    otros_mazos_records = (
        db.query(DeckCard.scryfall_card_id, Deck.name)
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(
            Deck.user_id == user_id, 
            Deck.id != deck.id,
            DeckCard.category.in_(["mainboard", "commander", "sideboard"])
        )
        .all()
    )
    mapa_nombres_mazos: Dict[str, List[str]] = {}
    for row in otros_mazos_records:
        mapa_nombres_mazos.setdefault(row[0], []).append(row[1])

    # 5. Clasificar estado cuantitativo y mapear metadatos canónicos
    resultado: List[DeckCardDetailResponse] = []
    for dc in cartas_mazo:
        scry_id: str = str(dc.scryfall_card_id)
        carta_cat = dc.card_catalog
        cantidad_pedida = dc.quantity or 1

        poseidas = total_poseidas.get(scry_id, 0)
        comprometidas = usadas_otros_mazos.get(scry_id, 0)
        libres = poseidas - comprometidas

        if libres >= cantidad_pedida:
            estado = "DISPONIBLE"
        elif poseidas >= cantidad_pedida:
            estado = "EN_OTRO_MAZO"
        else:
            estado = "FALTANTE"

        resultado.append(
            DeckCardDetailResponse(
                deck_card_id=str(dc.id),
                scryfall_card_id=scry_id,
                name=carta_cat.name if carta_cat else "Desconocida",
                set_code=carta_cat.set if carta_cat else None,
                type_line=carta_cat.type_line if carta_cat else None,
                mana_cost=getattr(carta_cat, "mana_cost", None) if carta_cat else None,
                cmc=getattr(carta_cat, "cmc", 0.0) if carta_cat else 0.0,
                image_url=carta_cat.image_url if carta_cat else None,
                quantity_needed=cantidad_pedida,
                category=dc.category,
                status=estado,
                assigned_other_decks=mapa_nombres_mazos.get(scry_id, [])
            )
        )

    return resultado