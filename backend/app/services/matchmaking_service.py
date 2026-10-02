# app/services/matchmaking_service.py
# ---------------------------------------------------------
# SERVICIO DEL MOTOR DE MATCHMAKING (CRUCE DE TRADES - POO / DDD)
# ---------------------------------------------------------
from typing import List, Dict, Set, Optional, Any
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload

from app.models import User, WishlistItem, UserCard, Collection
from app.schemas.trade import TradeMatchUserResponse, MatchedCard


class MatchedCardSanitizer:
    """
    Servicio de infraestructura y dominio para sanitizar y proyectar 
    instancias de cartas de catálogo e inventario hacia DTOs inmutables de trade.
    """

    @staticmethod
    def from_user_card(user_card: UserCard) -> MatchedCard:
        catalog = getattr(user_card, "card_catalog", None)
        
        raw_qty = getattr(user_card, "quantity", 1)
        qty_val = raw_qty if isinstance(raw_qty, int) and raw_qty > 0 else 1

        raw_cond = getattr(user_card, "condition", "NM")
        cond_val = str(raw_cond) if raw_cond else "NM"

        raw_foil = getattr(user_card, "is_foil", False)
        foil_val = bool(raw_foil) if isinstance(raw_foil, (bool, int)) else False

        name_val = getattr(catalog, "name", "Carta") if catalog else "Carta"
        set_val = getattr(catalog, "set", None) if catalog else None
        img_val = getattr(catalog, "image_url", None) if catalog else None

        return MatchedCard(
            scryfall_card_id=str(user_card.scryfall_card_id),
            card_name=str(name_val),
            set_code=str(set_val) if set_val else None,
            image_url=str(img_val) if img_val else None,
            quantity=qty_val,
            condition=cond_val,
            is_foil=foil_val
        )

    @staticmethod
    def from_wishlist_item(wishlist_item: WishlistItem) -> MatchedCard:
        catalog = getattr(wishlist_item, "card_catalog", None)

        raw_qty = getattr(wishlist_item, "quantity", 1)
        qty_val = raw_qty if isinstance(raw_qty, int) and raw_qty > 0 else 1

        name_val = getattr(catalog, "name", "Carta") if catalog else "Carta"
        set_val = getattr(catalog, "set", None) if catalog else None
        img_val = getattr(catalog, "image_url", None) if catalog else None

        return MatchedCard(
            scryfall_card_id=str(wishlist_item.scryfall_card_id),
            card_name=str(name_val),
            set_code=str(set_val) if set_val else None,
            image_url=str(img_val) if img_val else None,
            quantity=qty_val,
            condition="NM",
            is_foil=False
        )


class TradeMatchmaker:
    """
    Agregador de dominio encargado de resolver coincidencias de intercambio (Trade Matchmaking).
    Cruza listas de deseos activas contra carpetas públicas disponibles sin generar consultas N+1.
    """

    def __init__(self, db: Session, user_id: str) -> None:
        self.db: Session = db
        self.user_id: str = str(user_id)

    def _get_my_wishlist_card_ids(self) -> Set[str]:
        records = (
            self.db.query(WishlistItem.scryfall_card_id)
            .filter(WishlistItem.user_id == self.user_id)
            .all()
        )
        return {str(r[0]) for r in records if r and r[0]}

    def _get_my_trade_card_ids(self) -> Set[str]:
        records = (
            self.db.query(UserCard.scryfall_card_id)
            .join(Collection, UserCard.collection_id == Collection.id)
            .filter(
                Collection.user_id == self.user_id,
                Collection.is_public_trade.is_(True),
                UserCard.is_for_trade.is_(True)
            )
            .all()
        )
        return {str(r[0]) for r in records if r and r[0]}

    def _find_counterparts_with_my_wants(self, desired_card_ids: Set[str]) -> Dict[str, Dict[str, Any]]:
        matches = (
            self.db.query(UserCard, User)
            .join(Collection, UserCard.collection_id == Collection.id)
            .join(User, Collection.user_id == User.id)
            .options(joinedload(UserCard.card_catalog))
            .filter(
                User.id != self.user_id,
                Collection.is_public_trade.is_(True),
                UserCard.is_for_trade.is_(True),
                UserCard.scryfall_card_id.in_(desired_card_ids)
            )
            .all()
        )

        grouped_matches: Dict[str, Dict[str, Any]] = {}
        for user_card, counterpart_user in matches:
            cid = str(counterpart_user.id)
            if cid not in grouped_matches:
                grouped_matches[cid] = {
                    "user": counterpart_user,
                    "they_have": []
                }
            grouped_matches[cid]["they_have"].append(
                MatchedCardSanitizer.from_user_card(user_card)
            )

        return grouped_matches

    def _resolve_reverse_wants(
        self,
        candidate_ids: List[str],
        my_trade_ids: Set[str]
    ) -> Dict[str, List[MatchedCard]]:
        if not candidate_ids or not my_trade_ids:
            return defaultdict(list)

        wants_records = (
            self.db.query(WishlistItem)
            .options(joinedload(WishlistItem.card_catalog))
            .filter(
                WishlistItem.user_id.in_(candidate_ids),
                WishlistItem.scryfall_card_id.in_(my_trade_ids)
            )
            .all()
        )

        mapa_they_want: Dict[str, List[MatchedCard]] = defaultdict(list)
        for wl in wants_records:
            uid = str(getattr(wl, "user_id", ""))
            if not uid and len(candidate_ids) == 1:
                uid = candidate_ids[0]

            if uid:
                mapa_they_want[uid].append(
                    MatchedCardSanitizer.from_wishlist_item(wl)
                )

        return mapa_they_want

    def compute_matches(self, limit: int = 20) -> List[TradeMatchUserResponse]:
        desired_ids = self._get_my_wishlist_card_ids()
        if not desired_ids:
            return []

        my_trade_ids = self._get_my_trade_card_ids()
        counterparts = self._find_counterparts_with_my_wants(desired_ids)
        if not counterparts:
            return []

        candidate_ids = list(counterparts.keys())
        mapa_they_want = self._resolve_reverse_wants(candidate_ids, my_trade_ids)

        match_responses: List[TradeMatchUserResponse] = []
        for counterpart_id, data in counterparts.items():
            user: User = data["user"]
            they_want_cards = mapa_they_want.get(counterpart_id, [])
            is_mutual = len(they_want_cards) > 0

            raw_rep = getattr(user, "reputation_score", 100)
            rep_score = int(raw_rep) if isinstance(raw_rep, int) else 100

            raw_uname = getattr(user, "username", "Usuario")
            username_val = str(raw_uname) if raw_uname else "Usuario"

            match_responses.append(
                TradeMatchUserResponse(
                    user_id=str(user.id),
                    username=username_val,
                    reputation_score=rep_score,
                    is_mutual_match=is_mutual,
                    they_have=data["they_have"],
                    they_want=they_want_cards
                )
            )

        match_responses.sort(
            key=lambda item: (
                item.is_mutual_match,
                len(item.they_have) + len(item.they_want),
                item.reputation_score
            ),
            reverse=True
        )

        return match_responses[:limit]


def find_trade_matches_for_user(
    db: Session,
    user_id: str,
    limit: int = 20
) -> List[TradeMatchUserResponse]:
    """
    Fachada funcional compatible con el router FastAPI que delega al objeto TradeMatchmaker.
    """
    matchmaker = TradeMatchmaker(db=db, user_id=user_id)
    return matchmaker.compute_matches(limit=limit)