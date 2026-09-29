from typing import List, Dict, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case

from app.models.deck import Deck, DeckCard
from app.models.collection import Collection, UserCard
from app.schemas.deck import DeckCardDetailResponse


# ---------------------------------------------------------
# SERVICIO DE ANÁLISIS DE DISPONIBILIDAD DE INVENTARIO
# ---------------------------------------------------------
def calculate_deck_availability(db: Session, deck: Deck) -> List[DeckCardDetailResponse]:
    """
    Evalúa la disponibilidad física de las cartas requeridas por un mazo:
    - DISPONIBLE: Las copias totales menos las comprometidas en mazos activos cubren la cantidad requerida.
    - EN_OTRO_MAZO: El usuario posee copias suficientes, pero están ocupadas en mainboard/sideboard de otros mazos.
    - FALTANTE: El usuario no cuenta con copias suficientes en sus binders.
    
    * Nota: 'maybeboard' de otros mazos NO compromete copias físicas.
    """
    user_id: str = str(deck.user_id)

    # 1. Cargar las cartas del mazo actual con catálogo Scryfall
    cartas_mazo: List[DeckCard] = (
        db.query(DeckCard)
        .options(joinedload(DeckCard.card_catalog))
        .filter(DeckCard.deck_id == deck.id)
        .all()
    )

    if not cartas_mazo:
        return []

    # 2. Cantidad total poseída (total y disponibles sin marcar para trade)
    owned_query = (
        db.query(
            UserCard.scryfall_card_id,
            func.coalesce(func.sum(UserCard.quantity), 0).label("total_qty"),
            func.coalesce(
                func.sum(case((UserCard.is_for_trade.is_(False), UserCard.quantity), else_=0)), 
                0
            ).label("keep_qty")
        )
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id)
        .group_by(UserCard.scryfall_card_id)
        .all()
    )
    total_poseidas: Dict[str, int] = {scry_id: int(t_qty) for scry_id, t_qty, _ in owned_query}

    # 3. Cantidad comprometida en otros mazos (SOLO mainboard, commander y sideboard; se excluye maybeboard)
    used_query = (
        db.query(DeckCard.scryfall_card_id, func.coalesce(func.sum(DeckCard.quantity), 0))
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(
            Deck.user_id == user_id, 
            Deck.id != deck.id,
            DeckCard.category.in_(["mainboard", "commander", "sideboard"])
        )
        .group_by(DeckCard.scryfall_card_id)
        .all()
    )
    usadas_otros_mazos: Dict[str, int] = {scry_id: int(qty) for scry_id, qty in used_query}

    # 4. Detalle de nombres de otros mazos activos donde se usa la carta
    otros_mazos_records = (
        db.query(DeckCard.scryfall_card_id, Deck.name)
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(
            Deck.user_id == user_id, 
            Deck.id != deck.id,
            DeckCard.category.in_(["mainboard", "commander", "sideboard"])
        )
        .distinct()
        .all()
    )
    mapa_nombres_mazos: Dict[str, List[str]] = {}
    for scry_id, nombre_mazo in otros_mazos_records:
        mapa_nombres_mazos.setdefault(scry_id, []).append(nombre_mazo)

    # 5. Clasificar estado cuantitativo por carta
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
                image_url=carta_cat.image_url if carta_cat else None,
                quantity_needed=cantidad_pedida,
                category=dc.category,
                status=estado,
                assigned_other_decks=mapa_nombres_mazos.get(scry_id, [])
            )
        )

    return resultado