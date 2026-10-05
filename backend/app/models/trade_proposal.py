# app/models/trade_proposal.py
# ---------------------------------------------------------
# MODELOS DE DOMINIO: PROPUESTAS Y NEGOCIACIONES DE TRADE (DDD)
# ---------------------------------------------------------
"""
Módulo de dominio para la negociación de intercambios entre usuarios.
Encapsula la máquina de estados finitos (FSM) de una propuesta de trade,
la integridad transaccional de los ítems involucrados y el feedback único.
"""
import uuid
from enum import Enum
from datetime import datetime, timezone
from typing import Set, Dict
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    Boolean,
    Float,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class TradeStatus(str, Enum):
    PROPOSED = "proposed"
    COUNTERED = "countered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


# Matriz de transiciones permitidas del agregado
_VALID_TRANSITIONS: Dict[TradeStatus, Set[TradeStatus]] = {
    TradeStatus.PROPOSED: {TradeStatus.ACCEPTED, TradeStatus.REJECTED, TradeStatus.CANCELLED, TradeStatus.COUNTERED},
    TradeStatus.COUNTERED: {TradeStatus.ACCEPTED, TradeStatus.REJECTED, TradeStatus.CANCELLED},
    TradeStatus.ACCEPTED: {TradeStatus.COMPLETED, TradeStatus.CANCELLED},
    TradeStatus.REJECTED: set(),
    TradeStatus.CANCELLED: set(),
    TradeStatus.COMPLETED: set(),
}


class TradeProposalItem(Base):
    """Cartas individuales involucradas en la propuesta de intercambio."""
    __tablename__ = 'trade_proposal_items'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(String, ForeignKey('trade_proposals.id', ondelete='CASCADE'), nullable=False, index=True)
    user_card_id = Column(String, ForeignKey('user_cards.id', ondelete='RESTRICT'), nullable=False)
    
    # "offered" (del proponente) o "requested" (del receptor)
    side = Column(String(20), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    agreed_price_usd = Column(Numeric(10, 2), nullable=True)

    proposal = relationship("TradeProposal", back_populates="items")
    user_card = relationship("UserCard", lazy="select")


class TradeProposal(Base):
    """Agregado Raíz: Transacción y negociación P2P."""
    __tablename__ = 'trade_proposals'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    proposer_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    receiver_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    status = Column(String(20), default=TradeStatus.PROPOSED.value, nullable=False, index=True)
    
    # Compensación económica (ajuste en efectivo)
    cash_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    cash_currency = Column(String(5), default="COP", nullable=False)
    cash_payer_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    proposer = relationship("User", foreign_keys=[proposer_id], lazy="joined")
    receiver = relationship("User", foreign_keys=[receiver_id], lazy="joined")
    items = relationship(
        "TradeProposalItem", 
        back_populates="proposal", 
        cascade="all, delete-orphan", 
        lazy="selectin"
    )
    feedbacks = relationship(
        "TradeFeedback",
        back_populates="proposal",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # -------------------------------------------------------------------------
    # MÁQUINA DE ESTADOS Y TRANSICIONES DEL AGREGADO
    # -------------------------------------------------------------------------
    def _transition_to(self, target_status: TradeStatus) -> None:
        current = TradeStatus(self.status)
        allowed = _VALID_TRANSITIONS.get(current, set())
        if target_status not in allowed:
            raise ValueError(
                f"Transición de estado ilegal: No es posible pasar de '{current.value}' a '{target_status.value}'."
            )
        self.status = target_status.value

    def accept(self, user_id: str) -> None:
        """Acepta la propuesta. Solo puede ser ejecutado por el receptor."""
        if str(self.receiver_id) != str(user_id):
            raise PermissionError("Solo el receptor de la propuesta puede aceptarla.")
        self._transition_to(TradeStatus.ACCEPTED)

    def reject(self, user_id: str) -> None:
        """Rechaza la propuesta. Puede ser ejecutado por cualquiera de las partes."""
        if str(self.proposer_id) != str(user_id) and str(self.receiver_id) != str(user_id):
            raise PermissionError("No tienes permisos para rechazar esta propuesta.")
        self._transition_to(TradeStatus.REJECTED)

    def cancel(self, user_id: str) -> None:
        """Cancela la propuesta por parte del proponente."""
        if str(self.proposer_id) != str(user_id):
            raise PermissionError("Solo el proponente original puede cancelar la propuesta.")
        self._transition_to(TradeStatus.CANCELLED)

    def complete(self, user_id: str) -> None:
        """Marca el trade como completado tras validar precondiciones."""
        if str(self.proposer_id) != str(user_id) and str(self.receiver_id) != str(user_id):
            raise PermissionError("No perteneces a esta propuesta para marcarla como completada.")
        self._transition_to(TradeStatus.COMPLETED)


class TradeFeedback(Base):
    """Calificación y reseña emitida por un usuario sobre un intercambio completado."""
    __tablename__ = 'trade_feedbacks'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(String, ForeignKey('trade_proposals.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    target_user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    rating = Column(Float, nullable=False)
    comment = Column(String(500), nullable=True)
    successful = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    proposal = relationship("TradeProposal", back_populates="feedbacks")
    author = relationship("User", foreign_keys=[author_id], lazy="select")
    target_user = relationship("User", foreign_keys=[target_user_id], lazy="select")

    __table_args__ = (
        UniqueConstraint('proposal_id', 'author_id', name='uq_trade_feedback_proposal_author'),
    )