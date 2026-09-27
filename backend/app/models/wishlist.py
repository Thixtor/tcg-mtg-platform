import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# 6. WISHLIST / LISTA DE DESEOS
# ---------------------------------------------------------
class WishlistItem(Base):
    """
    Cartas deseadas por un usuario para matchmaking automático.
    """
    __tablename__ = 'wishlist_items'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    priority = Column(String, default="media")  # alta, media, baja

    user = relationship("User", backref="wishlist")
    card_catalog = relationship("CartaScryfall")