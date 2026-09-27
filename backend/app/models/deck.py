import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# 5. MAZOS / BIBLIOTECA DE DECKS (HASTA 10 POR USUARIO)
# ---------------------------------------------------------
class Deck(Base):
    """
    Estructura de mazo registrado por un usuario.
    """
    __tablename__ = 'decks'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    format = Column(String, default="Commander")
    description = Column(String, nullable=True)

    owner = relationship("User", backref="decks")
    cards = relationship("DeckCard", back_populates="deck", cascade="all, delete-orphan")


class DeckCard(Base):
    """
    Asignación de una carta del catálogo a un mazo específico.
    """
    __tablename__ = 'deck_cards'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deck_id = Column(String, ForeignKey('decks.id'), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    category = Column(String, default="mainboard")  # commander, mainboard, sideboard, maybeboard

    deck = relationship("Deck", back_populates="cards")
    card_catalog = relationship("CartaScryfall")