# app/services/inventory_service.py
# ---------------------------------------------------------
# SERVICIO DE ANÁLISIS DE DISPONIBILIDAD DE INVENTARIO (POO / DDD)
# ---------------------------------------------------------
from typing import List, Dict, Set
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import Deck, DeckCard, UserCard, Collection
from app.schemas.deck import DeckCardDetailResponse


class DeckAvailabilityAuditor:
    """
    Objeto de Servicio de Dominio encargado de auditar y cruzar
    los requerimientos de cartas de un mazo contra el inventario físico (UserCard/Collection)
    y los compromisos activos en otras barajas del mismo usuario.
    """

    CANONICAL_ACTIVE_CATEGORIES: Set[str] = {
        "mainboard", "commander", "sideboard", "companion"
    }

    def __init__(self, db: Session, deck: Deck) -> None:
        self.db: Session = db
        self.deck: Deck = deck
        self.user_id: str = str(deck.user_id)

    def _get_deck_cards(self) -> List[DeckCard]:
        """Obtiene las cartas del mazo optimizando la carga del catálogo."""
        return (
            self.db.query(DeckCard)
            .options(joinedload(DeckCard.card_catalog))
            .filter(DeckCard.deck_id == self.deck.id)
            .all()
        )

    def _get_total_owned_inventory(self) -> Dict[str, int]:
        """Suma la cantidad total de copias físicas disponibles en las colecciones del usuario."""
        owned_records = (
            self.db.query(
                UserCard.scryfall_card_id,
                func.coalesce(func.sum(UserCard.quantity), 0)
            )
            .join(Collection, UserCard.collection_id == Collection.id)
            .filter(Collection.user_id == self.user_id)
            .group_by(UserCard.scryfall_card_id)
            .all()
        )
        return {
            str(row[0]): int(row[1])
            for row in owned_records
            if row[0] is not None
        }

    def _get_other_decks_committed_inventory(self) -> Dict[str, int]:
        """Calcula el número de copias comprometidas en otros mazos del usuario."""
        committed_records = (
            self.db.query(
                DeckCard.scryfall_card_id,
                func.coalesce(func.sum(DeckCard.quantity), 0)
            )
            .join(Deck, DeckCard.deck_id == Deck.id)
            .filter(
                Deck.user_id == self.user_id,
                Deck.id != self.deck.id,
                DeckCard.category.in_(self.CANONICAL_ACTIVE_CATEGORIES)
            )
            .group_by(DeckCard.scryfall_card_id)
            .all()
        )
        return {
            str(row[0]): int(row[1])
            for row in committed_records
            if row[0] is not None
        }

    def _get_other_deck_assignments_map(self) -> Dict[str, List[str]]:
        """Mapea para cada carta los nombres de los otros mazos donde está asignada."""
        other_decks_records = (
            self.db.query(DeckCard.scryfall_card_id, Deck.name)
            .join(Deck, DeckCard.deck_id == Deck.id)
            .filter(
                Deck.user_id == self.user_id,
                Deck.id != self.deck.id,
                DeckCard.category.in_(self.CANONICAL_ACTIVE_CATEGORIES)
            )
            .all()
        )

        deck_map: Dict[str, List[str]] = defaultdict(list)
        for row in other_decks_records:
            card_id, deck_name = str(row[0]), str(row[1])
            if deck_name not in deck_map[card_id]:
                deck_map[card_id].append(deck_name)

        return deck_map

    @staticmethod
    def _resolve_status(owned: int, committed: int, needed: int) -> str:
        """Determina el estado físico de disponibilidad según inventario."""
        free_copies = owned - committed
        if free_copies >= needed:
            return "DISPONIBLE"
        if owned >= needed:
            return "EN_OTRO_MAZO"
        return "FALTANTE"

    def execute_audit(self) -> List[DeckCardDetailResponse]:
        """Ejecuta la auditoría integral y retorna los DTOs enriquecidos."""
        cartas_mazo = self._get_deck_cards()
        if not cartas_mazo:
            return []

        total_poseidas = self._get_total_owned_inventory()
        comprometidas_otros = self._get_other_decks_committed_inventory()
        mapa_nombres = self._get_other_deck_assignments_map()

        resultado: List[DeckCardDetailResponse] = []

        for dc in cartas_mazo:
            scry_id = str(dc.scryfall_card_id)
            carta_cat = getattr(dc, "card_catalog", None)

            # Normalización de cantidad
            raw_qty = getattr(dc, "quantity", 1)
            cantidad_pedida = int(raw_qty) if isinstance(raw_qty, int) and raw_qty > 0 else 1

            poseidas = total_poseidas.get(scry_id, 0)
            comprometidas = comprometidas_otros.get(scry_id, 0)
            estado = self._resolve_status(
                owned=poseidas,
                committed=comprometidas,
                needed=cantidad_pedida
            )

            # Normalización y sanitización de metadatos
            name_val = getattr(carta_cat, "name", None) or "Desconocida"
            set_val = getattr(carta_cat, "set", None) or getattr(carta_cat, "set_code", None)
            type_val = getattr(carta_cat, "type_line", None)
            mana_val = getattr(carta_cat, "mana_cost", None)
            img_val = getattr(carta_cat, "image_url", None)

            raw_cmc = getattr(carta_cat, "cmc", 0.0)
            try:
                cmc_val = float(raw_cmc) if raw_cmc is not None else 0.0
            except (ValueError, TypeError):
                cmc_val = 0.0

            raw_cat = getattr(dc, "category", "mainboard")
            category_val = str(raw_cat) if raw_cat else "mainboard"

            resultado.append(
                DeckCardDetailResponse(
                    deck_card_id=str(getattr(dc, "id", "dc-default")),
                    scryfall_card_id=scry_id,
                    name=str(name_val),
                    set_code=str(set_val) if set_val else None,
                    type_line=str(type_val) if type_val else None,
                    mana_cost=str(mana_val) if mana_val else None,
                    cmc=cmc_val,
                    image_url=str(img_val) if img_val else None,
                    quantity_needed=cantidad_pedida,
                    category=category_val,
                    status=estado,
                    assigned_other_decks=mapa_nombres.get(scry_id, [])
                )
            )

        return resultado


def calculate_deck_availability(db: Session, deck: Deck) -> List[DeckCardDetailResponse]:
    """
    Punto de entrada compatible con el router que delega la ejecución
    a la clase de dominio DeckAvailabilityAuditor.
    """
    auditor = DeckAvailabilityAuditor(db=db, deck=deck)
    return auditor.execute_audit()