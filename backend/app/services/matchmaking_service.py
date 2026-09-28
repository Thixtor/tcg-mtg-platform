from typing import List, Dict, Set, Any
from sqlalchemy.orm import Session, joinedload

# Importación de modelos y esquemas del núcleo
from app.models import User, WishlistItem, UserCard, Collection
from app.schemas import TradeMatchUserResponse, MatchedCard


# ---------------------------------------------------------
# SERVICIO DEL MOTOR DE MATCHMAKING (CRUCE DE TRADES)
# ---------------------------------------------------------
def find_trade_matches_for_user(db: Session, user_id: str) -> List[TradeMatchUserResponse]:
    """
    Ejecuta el cruce algorítmico entre la lista de deseos y la bolsa de intercambio:
    1. Obtiene las cartas que el usuario busca (Wishlist).
    2. Identifica contrapartes que posean esas cartas marcadas como is_for_trade = True.
    3. Comprueba si esas contrapartes buscan cartas que el usuario ofrece (Mutual Match).
    4. Ordena los resultados priorizando las coincidencias mutuas al inicio.
    """
    # 1. Obtener IDs de cartas requeridas por el usuario
    mi_wishlist = db.query(WishlistItem.scryfall_card_id).filter(WishlistItem.user_id == user_id).all()
    mis_deseos_ids: Set[str] = {w[0] for w in mi_wishlist}

    if not mis_deseos_ids:
        return []

    # 2. Obtener IDs de cartas que este usuario tiene disponibles para cambio
    mis_cartas_trade = (
        db.query(UserCard.scryfall_card_id)
        .join(Collection, UserCard.collection_id == Collection.id)
        .filter(Collection.user_id == user_id, UserCard.is_for_trade == True)
        .all()
    )
    mis_trade_ids: Set[str] = {c[0] for c in mis_cartas_trade}

    # 3. Buscar otros usuarios que tengan en trade cartas de mi wishlist (con joinedload para evitar N+1)
    otros_con_mis_deseos = (
        db.query(UserCard, User)
        .join(Collection, UserCard.collection_id == Collection.id)
        .join(User, Collection.user_id == User.id)
        .options(joinedload(UserCard.card_catalog))
        .filter(
            User.id != user_id,
            UserCard.is_for_trade == True,
            UserCard.scryfall_card_id.in_(mis_deseos_ids)
        )
        .all()
    )

    usuarios_coincidentes: Dict[str, Dict[str, Any]] = {}
    for user_card, otro_usuario in otros_con_mis_deseos:
        if otro_usuario.id not in usuarios_coincidentes:
            usuarios_coincidentes[otro_usuario.id] = {
                "user": otro_usuario,
                "they_have": []
            }
        carta_cat = user_card.card_catalog
        usuarios_coincidentes[otro_usuario.id]["they_have"].append(
            MatchedCard(
                scryfall_card_id=user_card.scryfall_card_id,
                card_name=carta_cat.name if carta_cat else "Carta",
                image_url=carta_cat.image_url if carta_cat else None,
                condition=user_card.condition,
                is_foil=user_card.is_foil
            )
        )

    # 4. Validar cruce bidireccional (si la contraparte busca lo que yo tengo)
    resultados: List[TradeMatchUserResponse] = []
    for otro_id, data in usuarios_coincidentes.items():
        otro_user: User = data["user"]

        they_want_records = (
            db.query(WishlistItem)
            .options(joinedload(WishlistItem.card_catalog))
            .filter(
                WishlistItem.user_id == otro_id,
                WishlistItem.scryfall_card_id.in_(mis_trade_ids)
            )
            .all()
        )

        they_want_cards: List[MatchedCard] = []
        for wl in they_want_records:
            carta_cat = wl.card_catalog
            they_want_cards.append(
                MatchedCard(
                    scryfall_card_id=wl.scryfall_card_id,
                    card_name=carta_cat.name if carta_cat else "Carta",
                    image_url=carta_cat.image_url if carta_cat else None
                )
            )

        resultados.append(
            TradeMatchUserResponse(
                user_id=otro_user.id,
                username=otro_user.username,
                # phone_number retirado para proteger PII
                reputation_score=otro_user.reputation_score,
                they_have=data["they_have"],
                they_want=they_want_cards,
                is_mutual_match=(len(they_want_cards) > 0)
            )
        )

    # 5. Ordenar priorizando coincidencias mutuas al inicio
    resultados.sort(key=lambda r: r.is_mutual_match, reverse=True)
    return resultados