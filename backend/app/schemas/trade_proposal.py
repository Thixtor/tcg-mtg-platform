# app/schemas/trade_proposal.py
# ---------------------------------------------------------
# CONTRATO DTO: ESQUEMAS PYDANTIC PARA PROPUESTAS DE TRADE
# ---------------------------------------------------------
"""
Módulo de esquemas de transferencia y validación de datos para la negociación de intercambios P2P.
Controla las entradas para la creación de propuestas, validación de cantidades
y la serialización segura con enmascaramiento de datos personales (PII).
"""

from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------
# 1. ESQUEMAS DE ENTRADA (PAYLOADS)
# ---------------------------------------------------------

class TradeItemInput(BaseModel):
    """Representa la selección de una carta física y la cantidad a negociar."""
    user_card_id: str = Field(..., description="UUID de la copia física en el inventario.")
    quantity: int = Field(default=1, ge=1, description="Cantidad física a transferir (mínimo 1).")

    model_config = ConfigDict(from_attributes=True)


# Alias semántico para consistencia con el servicio de dominio
TradeProposalItemPayload = TradeItemInput


class CreateTradeProposalPayload(BaseModel):
    """Payload para la inicialización formal de una propuesta de intercambio."""
    receiver_id: str = Field(..., description="UUID del usuario destinatario de la oferta.")
    offered_user_card_ids: List[TradeItemInput] = Field(
        default_factory=list, 
        description="Lista de cartas pertenecientes al proponente que se entregan."
    )
    requested_user_card_ids: List[TradeItemInput] = Field(
        default_factory=list, 
        description="Lista de cartas solicitadas de los binders públicos del receptor."
    )
    cash_amount: Decimal = Field(
        default=Decimal("0.00"), 
        ge=0, 
        description="Monto de compensación monetaria en caso de desbalance."
    )
    cash_currency: str = Field(default="COP", max_length=5, description="Moneda de curso (ISO 4217).")
    cash_payer_id: Optional[str] = Field(
        default=None, 
        description="UUID del usuario obligado a pagar la compensación."
    )
    notes: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="Comentarios opcionales de la negociación."
    )

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# 2. ESQUEMAS DE RESPUESTA (DTOs)
# ---------------------------------------------------------

class TradeProposalResponse(BaseModel):
    """
    DTO de visualización de propuestas de trade.
    Aplica protección estricta sobre PII: contact_phone se oculta
    hasta que la negociación alcance el estado 'accepted' o 'completed'.
    """
    id: str
    proposer_id: str
    receiver_id: str
    status: str
    cash_amount: Decimal
    cash_currency: str
    cash_payer_id: Optional[str] = None
    notes: Optional[str] = None
    contact_phone: Optional[str] = Field(
        default=None, 
        description="Teléfono de contacto directo (solo visible tras aceptación)."
    )
    offered_items_count: int
    requested_items_count: int

    model_config = ConfigDict(from_attributes=True)