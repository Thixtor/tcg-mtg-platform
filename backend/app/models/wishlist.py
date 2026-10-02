import uuid
from enum import Enum
from typing import Optional
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class WishlistPriority(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class WishlistItem(Base):
    """
    Entidad de Dominio: Carta solicitada por un usuario para construcción
    o adquisición mediante Matchmaking P2P inteligente.
    """
    __tablename__ = 'wishlist_items'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    priority = Column(String, default=WishlistPriority.MEDIA.value, nullable=False)

    user = relationship("User", back_populates="wishlist_items")
    card_catalog = relationship("CartaScryfall", lazy="joined")

    __table_args__ = (
        UniqueConstraint('user_id', 'scryfall_card_id', name='uq_user_wishlist_card'),
    )

    def change_quantity(self, new_quantity: int) -> None:
        if new_quantity <= 0:
            raise ValueError("La cantidad deseada debe ser superior a cero.")
        self.quantity = new_quantity

    def set_priority(self, new_priority: str) -> None:
        valid_priorities = {p.value for p in WishlistPriority}
        cleaned = new_priority.strip().lower()
        if cleaned not in valid_priorities:
            raise ValueError(f"Prioridad inválida: {new_priority}. Opciones permitidas: {valid_priorities}")
        self.priority = cleaned