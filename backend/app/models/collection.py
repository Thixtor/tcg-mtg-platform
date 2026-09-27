import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# 3. COLECCIONES / BINDERS DEL USUARIO
# ---------------------------------------------------------
class Collection(Base):
    """
    Carpetas físicas o binders (hasta 10 por usuario).
    """
    __tablename__ = 'collections'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    owner = relationship("User", back_populates="collections")
    cards = relationship("UserCard", back_populates="collection", cascade="all, delete-orphan")


# ---------------------------------------------------------
# 4. CARTAS FÍSICAS EN COLECCIÓN (TRADE / INVENTARIO)
# ---------------------------------------------------------
class UserCard(Base):
    """
    Instancia física que posee un usuario con su estado, idioma y flag de trade.
    """
    __tablename__ = 'user_cards'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String, ForeignKey('collections.id'), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    condition = Column(String, default="NM")  # NM, LP, MP, HP, DMG
    language = Column(String, default="en")
    is_foil = Column(Boolean, default=False)

    # Flags para el muro de intercambio P2P
    is_for_trade = Column(Boolean, default=False, index=True)
    trade_notes = Column(String, nullable=True)

    collection = relationship("Collection", back_populates="cards")
    card_catalog = relationship("CartaScryfall", back_populates="instances_in_collections")