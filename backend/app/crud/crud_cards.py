from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.card import CartaScryfall


# ---------------------------------------------------------
# OPERACIONES DE BASE DE DATOS: CATÁLOGO DE CARTAS
# ---------------------------------------------------------
def get_card_by_id(db: Session, card_id: str) -> Optional[CartaScryfall]:
    """
    Obtiene una carta por su identificador primario (UUID de Scryfall).
    """
    return db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()


def search_cards_by_name(db: Session, query_text: str, limit: int = 20) -> List[CartaScryfall]:
    """
    Busca cartas en el catálogo local por coincidencia parcial insensible a mayúsculas/minúsculas.
    """
    return (
        db.query(CartaScryfall)
        .filter(CartaScryfall.name.ilike(f"%{query_text}%"))
        .limit(limit)
        .all()
    )