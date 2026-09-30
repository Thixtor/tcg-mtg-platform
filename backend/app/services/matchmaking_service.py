from typing import List, Dict, Set, Any
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload

from app.models import User, WishlistItem, UserCard, Collection
from app.schemas.trade import TradeMatchUserResponse, MatchedCard


# ---------------------------------------------------------
# SERVICIO DEL MOTOR DE MATCHMAKING (CRUCE DE TRADES)
# ---------------------------------------------------------
def find_trade_matches_for_user(
    db: Session, 
    user_id: str, 
    limit: int = 20
) -> List[TradeMatchUserResponse]:
    """
    Ejecuta el cruce algorítmico entre la lista de deseos (Wishlist) y binders públicos:
    1. Obtiene las cartas que el usuario busca (Wishlist).
    2. Identifica usuarios con binders públicos (is_public_trade = True) que ofrecen esas cartas.
    3. Resuelve en UNA sola consulta agrupada qué cartas mías buscan ellos (sin N+1).
    4. Ordena priorizando coincidencias mutuas y reputación de usuario.
    """
    # 1. Obtener IDs de cartas requeridas por el usuario en su Wishlist
    mi_wishlist = (
        db.query(WishlistItem.scryfall_card_id)
        .filter(WishlistItem.user_id == user_id)
        .all()
    )
    mis_deseos_ids: Set[str] = {w[0] for w in mi_wishlist}

    if not mis_deseos_ids:
        return []

    # 2. Obtener IDs de cartas que YO ofrezco en mis carpetas públicas para trade
    mis_cartas_trade = (
        db.query(UserCard.scryfall_card_id)
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(
            Collection.user_id == user_id,
            Collection.is_public_trade.is_(True),  # Privacidad respetada
            UserCard.is_for_trade.is_(True)
        )
        .all()
    )
    mis_trade_ids: Set[str] = {c[0] for c in mis_cartas_trade}

    # 3. Buscar contrapartes con binders públicos que tengan cartas de mi wishlist
    otros_con_mis_deseos = (
        db.query(UserCard, User)
        .join(Collection, UserCard.collection_id == Collection.id)
        .join(User, Collection.user_id == User.id)
        .options(joinedload(UserCard.card_catalog))
        .filter(
            User.id != user_id,
            Collection.is_public_trade.is_(True),  # Privacidad respetada
            UserCard.is_for_trade.is_(True),
            UserCard.scryfall_card_id.in_(mis_deseos_ids)
        )
        .all()
    )

    if not otros_con_mis_deseos:
        return []

    usuarios_coincidentes: Dict[str, Dict[str, Any]] = {}
    for user_card, otro_usuario in otros_con_mis_deseos:
        otro_id = str(otro_usuario.id)
        if otro_id not in usuarios_coincidentes:
            usuarios_coincidentes[otro_id] = {
                "user": otro_usuario,
                "they_have": []
            }
        carta_cat = user_card.card_catalog
        usuarios_coincidentes[otro_id]["they_have"].append(
            MatchedCard(
                scryfall_card_id=user_card.scryfall_card_id,
                card_name=carta_cat.name if carta_cat else "Carta",
                set_code=carta_cat.set if carta_cat else None,
                image_url=carta_cat.image_url if carta_cat else None,
                quantity=user_card.quantity,
                condition=user_card.condition,
                is_foil=user_card.is_foil
            )
        )

    # 4. OPTIMIZACIÓN SQL: Resolver en UNA sola consulta qué quieren ellos que yo tengo (Sin N+1)
    mapa_they_want: Dict[str, List[MatchedCard]] = defaultdict(list)
    
    if mis_trade_ids:
        candidatos_ids = list(usuarios_coincidentes.keys())
        wants_records = (
            db.query(WishlistItem)
            .options(joinedload(WishlistItem.card_catalog))
            .filter(
                WishlistItem.user_id.in_(candidatos_ids),
                WishlistItem.scryfall_card_id.in_(mis_trade_ids)
            )
            .all()
        )

        for wl in wants_records:
            carta_cat = wl.card_catalog
            mapa_they_want[str(wl.user_id)].append(
                MatchedCard(
                    scryfall_card_id=wl.scryfall_card_id,
                    card_name=carta_cat.name if carta_cat else "Carta",
                    set_code=carta_cat.set if carta_cat else None,
                    image_url=carta_cat.image_url if carta_cat else None,
                    quantity=1
                )
            )

    # 5. Construir respuesta estructurada
    resultados: List[TradeMatchUserResponse] = []
    for otro_id, data in usuarios_coincidentes.items():
        otro_user: User = data["user"]
        they_want_cards = mapa_they_want.get(otro_id, [])
        is_mutual = len(they_want_cards) > 0

        resultados.append(
            TradeMatchUserResponse(
                user_id=str(otro_user.id),
                username=otro_user.username,
                reputation_score=otro_user.reputation_score or 100,
                is_mutual_match=is_mutual,
                they_have=data["they_have"],
                they_want=they_want_cards
            )
        )

    # 6. Ordenar: Coincidencias mutuas primero, luego por cantidad de cartas y reputación
    resultados.sort(
        key=lambda r: (r.is_mutual_match, len(r.they_have) + len(r.they_want), r.reputation_score),
        reverse=True
    )
    return resultados[:limit]