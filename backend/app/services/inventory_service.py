from typing import List, Dict, Set
from sqlalchemy.orm import Session

# Importación de modelos y esquemas del núcleo
from app.models import Deck, DeckCard, UserCard, Collection
from app.schemas import DeckCardDetailResponse


# ---------------------------------------------------------
# SERVICIO DE ANÁLISIS DE DISPONIBILIDAD DE INVENTARIO
# ---------------------------------------------------------
def calculate_deck_availability(db: Session, deck: Deck) -> List[DeckCardDetailResponse]:
    """
    Evalúa la disponibilidad física de las cartas requeridas por un mazo:
    - DISPONIBLE: El usuario posee copias físicas en sus carpetas o binders.
    - EN_OTRO_MAZO: La carta se encuentra asignada en otro mazo del usuario.
    - FALTANTE: El usuario no cuenta con la carta en ninguna colección.

    Args:
        db (Session): Sesión activa de SQLAlchemy.
        deck (Deck): Instancia del mazo a analizar.

    Returns:
        List[DeckCardDetailResponse]: Lista detallada con el estado de cada carta del mazo.
    """
    user_id: str = deck.user_id
    cartas_mazo: List[DeckCard] = db.query(DeckCard).filter(DeckCard.deck_id == deck.id).all()

    # 1. Obtener el conjunto de IDs de cartas que el usuario posee físicamente
    cartas_en_colecciones = (
        db.query(UserCard.scryfall_card_id)
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id)
        .all()
    )
    ids_en_posesion: Set[str] = {c[0] for c in cartas_en_colecciones}

    # 2. Mapear qué cartas están comprometidas en otros mazos del mismo usuario
    otros_mazos_cards = (
        db.query(DeckCard.scryfall_card_id, Deck.name)
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(Deck.user_id == user_id, Deck.id != deck.id)
        .all()
    )
    
    mapa_otros_mazos: Dict[str, List[str]] = {}
    for scry_id, nombre_mazo in otros_mazos_cards:
        mapa_otros_mazos.setdefault(scry_id, []).append(nombre_mazo)

    # 3. Determinar el estado y construir la respuesta estructurada
    resultado: List[DeckCardDetailResponse] = []
    for dc in cartas_mazo:
        scry_id: str = dc.scryfall_card_id
        carta_cat = dc.card_catalog

        # Clasificación de inventario físico
        if scry_id in mapa_otros_mazos:
            estado = "EN_OTRO_MAZO"
        elif scry_id in ids_en_posesion:
            estado = "DISPONIBLE"
        else:
            estado = "FALTANTE"

        resultado.append(
            DeckCardDetailResponse(
                deck_card_id=dc.id,
                scryfall_card_id=scry_id,
                name=carta_cat.name if carta_cat else "Desconocida",
                set_code=carta_cat.set if carta_cat else None,
                image_url=carta_cat.image_url if carta_cat else None,
                quantity_needed=dc.quantity,
                category=dc.category,
                status=estado,
                assigned_other_decks=mapa_otros_mazos.get(scry_id, [])
            )
        )

    return resultado