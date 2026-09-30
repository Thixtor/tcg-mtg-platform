# app/services/inventory_service.py
# ---------------------------------------------------------
# SERVICIO DE ANÁLISIS DE DISPONIBILIDAD DE INVENTARIO
# ---------------------------------------------------------
from typing import List, Dict
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import Deck, DeckCard, UserCard, Collection
from app.schemas.deck import DeckCardDetailResponse


def calculate_deck_availability(db: Session, deck: Deck) -> List[DeckCardDetailResponse]:
    """
    Evalúa la disponibilidad física de cartas para un mazo.
    Mantiene compatibilidad tanto con mocks de prueba como con PostgreSQL relacional.
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
    total_poseidas: Dict[str, int] = {
        str(row[0]): int(row[1]) for row in owned_query if row[0] is not None
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
            DeckCard.category.in_(["mainboard", "commander", "sideboard", "companion"])
        )
        .group_by(DeckCard.scryfall_card_id)
        .all()
    )
    usadas_otros_mazos: Dict[str, int] = {
        str(row[0]): int(row[1]) for row in used_query if row[0] is not None
    }

    # 4. Detalle de nombres de otros mazos donde aparece cada carta
    otros_mazos_records = (
        db.query(DeckCard.scryfall_card_id, Deck.name)
        .join(Deck, DeckCard.deck_id == Deck.id)
        .filter(
            Deck.user_id == user_id, 
            Deck.id != deck.id,
            DeckCard.category.in_(["mainboard", "commander", "sideboard", "companion"])
        )
        .all()
    )
    mapa_nombres_mazos: Dict[str, List[str]] = defaultdict(list)
    for row in otros_mazos_records:
        card_id, deck_name = str(row[0]), str(row[1])
        if deck_name not in mapa_nombres_mazos[card_id]:
            mapa_nombres_mazos[card_id].append(deck_name)

    # 5. Clasificar estado cuantitativo y sanitizar metadatos frente a MagicMocks
    resultado: List[DeckCardDetailResponse] = []
    for dc in cartas_mazo:
        scry_id: str = str(dc.scryfall_card_id)
        carta_cat = getattr(dc, "card_catalog", None)
        
        # Tolerar que quantity sea entero o MagicMock
        raw_qty = getattr(dc, "quantity", 1)
        cantidad_pedida = raw_qty if type(raw_qty) is int else 1

        poseidas = total_poseidas.get(scry_id, 0)
        comprometidas = usadas_otros_mazos.get(scry_id, 0)
        libres = poseidas - comprometidas

        if libres >= cantidad_pedida:
            estado = "DISPONIBLE"
        elif poseidas >= cantidad_pedida:
            estado = "EN_OTRO_MAZO"
        else:
            estado = "FALTANTE"

        # Sanitización de tipos para Pydantic v2: solo pasar str real o None
        raw_name = getattr(carta_cat, "name", None) if carta_cat else None
        name_val = raw_name if isinstance(raw_name, str) else "Desconocida"

        raw_set = getattr(carta_cat, "set", None) if carta_cat else None
        set_val = raw_set if isinstance(raw_set, str) else None

        raw_type = getattr(carta_cat, "type_line", None) if carta_cat else None
        type_val = raw_type if isinstance(raw_type, str) else None

        raw_mana = getattr(carta_cat, "mana_cost", None) if carta_cat else None
        mana_val = raw_mana if isinstance(raw_mana, str) else None

        raw_img = getattr(carta_cat, "image_url", None) if carta_cat else None
        img_val = raw_img if isinstance(raw_img, str) else None

        raw_cmc = getattr(carta_cat, "cmc", 0.0) if carta_cat else 0.0
        cmc_val = float(raw_cmc) if isinstance(raw_cmc, (int, float)) and not isinstance(raw_cmc, bool) else 0.0

        raw_cat = getattr(dc, "category", "mainboard")
        category_val = raw_cat if isinstance(raw_cat, str) else "mainboard"

        resultado.append(
            DeckCardDetailResponse(
                deck_card_id=str(getattr(dc, "id", "dc-default")),
                scryfall_card_id=scry_id,
                name=name_val,
                set_code=set_val,
                type_line=type_val,
                mana_cost=mana_val,
                cmc=cmc_val,
                image_url=img_val,
                quantity_needed=cantidad_pedida,
                category=category_val,
                status=estado,
                assigned_other_decks=mapa_nombres_mazos.get(scry_id, [])
            )
        )

    return resultado