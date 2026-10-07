# app/services/inventory_service.py
# ---------------------------------------------------------
# SERVICIO DE ANÁLISIS DE DISPONIBILIDAD DE INVENTARIO (MTG)
# ---------------------------------------------------------
from typing import List, Dict, Set, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models import Deck, DeckCard, UserCard, Collection
from app.schemas.deck import DeckCardDetailResponse


class DeckAvailabilityAuditor:
    CANONICAL_ACTIVE_CATEGORIES: Set[str] = {
        "mainboard", "commander", "sideboard", "companion"
    }

    def __init__(self, db: Session, deck: Deck) -> None:
        self.db: Session = db
        self.deck: Deck = deck
        self.user_id: str = str(deck.user_id)

    def _get_deck_cards(self) -> List[DeckCard]:
        query = self.db.query(DeckCard).filter(DeckCard.deck_id == self.deck.id)
        if hasattr(DeckCard, "card_catalog"):
            query = query.options(joinedload(DeckCard.card_catalog))
        return query.all()

    def _get_total_owned_inventory(self) -> Tuple[Dict[str, int], Dict[str, int]]:
        """Suma copias físicas en colecciones por ID y por nombre normalizado."""
        user_cards_query = (
            self.db.query(UserCard)
            .join(Collection, UserCard.collection_id == Collection.id)
            .filter(Collection.user_id == self.user_id)
        )
        if hasattr(UserCard, "card_catalog"):
            user_cards_query = user_cards_query.options(joinedload(UserCard.card_catalog))

        owned_items = user_cards_query.all()

        by_id: Dict[str, int] = defaultdict(int)
        by_name: Dict[str, int] = defaultdict(int)

        for uc in owned_items:
            scry_id = str(getattr(uc, "scryfall_card_id", "") or "").strip()
            qty = int(getattr(uc, "quantity", 1) or 1)
            cat = getattr(uc, "card_catalog", None)
            card_name = str(getattr(cat, "name", "") or getattr(uc, "name", "") or "").strip().lower()

            if scry_id:
                by_id[scry_id] += qty
            if card_name:
                by_name[card_name] += qty

        return by_id, by_name

    def _get_other_decks_committed_inventory(self) -> Tuple[Dict[str, int], Dict[str, int]]:
        """Suma copias asignadas en otros mazos del mismo usuario."""
        other_cards_query = (
            self.db.query(DeckCard)
            .join(Deck, DeckCard.deck_id == Deck.id)
            .filter(
                Deck.user_id == self.user_id,
                Deck.id != self.deck.id,
                DeckCard.category.in_(self.CANONICAL_ACTIVE_CATEGORIES)
            )
        )
        if hasattr(DeckCard, "card_catalog"):
            other_cards_query = other_cards_query.options(joinedload(DeckCard.card_catalog))

        other_cards = other_cards_query.all()

        by_id: Dict[str, int] = defaultdict(int)
        by_name: Dict[str, int] = defaultdict(int)

        for dc in other_cards:
            scry_id = str(getattr(dc, "scryfall_card_id", "") or "").strip()
            qty = int(getattr(dc, "quantity", 1) or 1)
            cat = getattr(dc, "card_catalog", None)
            card_name = str(getattr(cat, "name", "") or getattr(dc, "name", "") or "").strip().lower()

            if scry_id:
                by_id[scry_id] += qty
            if card_name:
                by_name[card_name] += qty

        return by_id, by_name

    def _get_other_deck_assignments_map(self) -> Dict[str, List[str]]:
        """Mapea los nombres de los otros mazos donde está la carta."""
        records = (
            self.db.query(DeckCard, Deck.name)
            .join(Deck, DeckCard.deck_id == Deck.id)
            .filter(
                Deck.user_id == self.user_id,
                Deck.id != self.deck.id,
                DeckCard.category.in_(self.CANONICAL_ACTIVE_CATEGORIES)
            )
            .all()
        )

        deck_map: Dict[str, List[str]] = defaultdict(list)
        for dc, deck_name in records:
            scry_id = str(getattr(dc, "scryfall_card_id", "") or "").strip()
            cat = getattr(dc, "card_catalog", None)
            card_name = str(getattr(cat, "name", "") or getattr(dc, "name", "") or "").strip().lower()
            d_name = str(deck_name)

            if scry_id and d_name not in deck_map[scry_id]:
                deck_map[scry_id].append(d_name)
            if card_name and d_name not in deck_map[card_name]:
                deck_map[card_name].append(d_name)

        return deck_map

    def _get_community_trade_inventory(self) -> Tuple[Dict[str, int], Dict[str, int]]:
        """
        Calcula copias activas en trade (is_for_trade == True)
        de otros usuarios de la plataforma por ID y nombre canónico.
        """
        trade_records_query = (
            self.db.query(UserCard)
            .join(Collection, UserCard.collection_id == Collection.id)
            .filter(
                Collection.user_id != self.user_id,
                getattr(UserCard, "is_for_trade", False) == True
            )
        )
        if hasattr(UserCard, "card_catalog"):
            trade_records_query = trade_records_query.options(joinedload(UserCard.card_catalog))

        trade_cards = trade_records_query.all()

        by_id: Dict[str, int] = defaultdict(int)
        by_name: Dict[str, int] = defaultdict(int)

        for uc in trade_cards:
            scry_id = str(getattr(uc, "scryfall_card_id", "") or "").strip()
            qty = int(getattr(uc, "quantity", 1) or 1)
            cat = getattr(uc, "card_catalog", None)
            card_name = str(getattr(cat, "name", "") or getattr(uc, "name", "") or "").strip().lower()

            if scry_id:
                by_id[scry_id] += qty
            if card_name:
                by_name[card_name] += qty

        return by_id, by_name

    @staticmethod
    def _resolve_status(owned: int, committed: int, needed: int) -> str:
        free_copies = owned - committed
        if free_copies >= needed:
            return "DISPONIBLE"
        if committed > 0 or owned > 0:
            return "EN_OTRO_MAZO"
        return "FALTANTE"

    def execute_audit(self) -> List[DeckCardDetailResponse]:
        cartas_mazo = self._get_deck_cards()
        if not cartas_mazo:
            return []

        owned_by_id, owned_by_name = self._get_total_owned_inventory()
        comm_by_id, comm_by_name = self._get_other_decks_committed_inventory()
        mapa_nombres = self._get_other_deck_assignments_map()
        trade_by_id, trade_by_name = self._get_community_trade_inventory()

        resultado: List[DeckCardDetailResponse] = []

        for dc in cartas_mazo:
            scry_id = str(getattr(dc, "scryfall_card_id", "") or "").strip()
            carta_cat = getattr(dc, "card_catalog", None)

            name_val = (
                getattr(carta_cat, "name", None)
                or getattr(dc, "name", None)
                or "Desconocida"
            )
            canonical_name = name_val.strip().lower()

            raw_qty = getattr(dc, "quantity", 1)
            cantidad_pedida = int(raw_qty) if isinstance(raw_qty, int) and raw_qty > 0 else 1

            poseidas = owned_by_id.get(scry_id) or owned_by_name.get(canonical_name, 0)
            comprometidas = comm_by_id.get(scry_id) or comm_by_name.get(canonical_name, 0)
            disponibles_trade = trade_by_id.get(scry_id) or trade_by_name.get(canonical_name, 0)

            estado = self._resolve_status(
                owned=poseidas,
                committed=comprometidas,
                needed=cantidad_pedida
            )

            set_val = getattr(carta_cat, "set", None) or getattr(carta_cat, "set_code", None)
            type_val = getattr(carta_cat, "type_line", None) or getattr(dc, "type_line", None)
            mana_val = getattr(carta_cat, "mana_cost", None) or getattr(dc, "mana_cost", None)
            img_val = getattr(carta_cat, "image_url", None) or getattr(dc, "image_url", None)

            raw_cmc = getattr(carta_cat, "cmc", None) or getattr(dc, "cmc", 0.0)
            try:
                cmc_val = float(raw_cmc) if raw_cmc is not None else 0.0
            except (ValueError, TypeError):
                cmc_val = 0.0

            raw_cat = getattr(dc, "category", "mainboard")
            category_val = str(raw_cat) if raw_cat else "mainboard"

            assigned_decks = mapa_nombres.get(scry_id) or mapa_nombres.get(canonical_name, [])

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
                    assigned_other_decks=assigned_decks,
                    available_in_trade_count=disponibles_trade
                )
            )

        return resultado


def calculate_deck_availability(db: Session, deck: Deck) -> List[DeckCardDetailResponse]:
    auditor = DeckAvailabilityAuditor(db=db, deck=deck)
    return auditor.execute_audit()