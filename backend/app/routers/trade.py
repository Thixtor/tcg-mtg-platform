# app/routers/trade.py
# ---------------------------------------------------------
# ROUTER: PROPUESTAS Y NEGOCIACIONES DE INTERCAMBIO (TRADE)
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.trade_proposal import (
    CreateTradeProposalPayload,
    TradeProposalResponse
)
from app.services.trade_proposal_service import TradeProposalService

router = APIRouter(
    prefix="/trade",
    tags=["Intercambios y Propuestas (Trade)"]
)


@router.post(
    "/proposals",
    response_model=TradeProposalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear y enviar una nueva propuesta de intercambio"
)
def create_proposal(
    payload: CreateTradeProposalPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inicia una propuesta P2P. Valida que el proponente posea las cartas ofrecidas
    y que la contraparte posea las cartas solicitadas.
    """
    proposal = TradeProposalService.create_proposal(
        db=db,
        proposer=current_user,
        payload=payload
    )
    return TradeProposalService.build_response_dto(proposal, requester_id=str(current_user.id))


@router.get(
    "/proposals/me",
    response_model=List[TradeProposalResponse],
    summary="Listar mis propuestas de intercambio activas e históricas"
)
def get_my_proposals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna todas las propuestas donde el usuario es proponente o receptor."""
    proposals = TradeProposalService.get_user_proposals(
        db=db,
        user_id=str(current_user.id)
    )
    return [
        TradeProposalService.build_response_dto(p, requester_id=str(current_user.id))
        for p in proposals
    ]


@router.get(
    "/proposals/{proposal_id}",
    response_model=TradeProposalResponse,
    summary="Consultar el detalle de una propuesta"
)
def get_proposal_detail(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna el estado de la propuesta.
    Si el estado es ACCEPTED, expone el contacto directo para coordinar la entrega.
    """
    proposal = TradeProposalService.get_proposal_by_id_or_fail(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.build_response_dto(proposal, requester_id=str(current_user.id))


@router.post(
    "/proposals/{proposal_id}/accept",
    response_model=TradeProposalResponse,
    summary="Aceptar una propuesta de intercambio"
)
def accept_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite al receptor aceptar la propuesta.
    Cambia el estado a ACCEPTED y habilita el intercambio de contactos.
    """
    proposal = TradeProposalService.accept_proposal(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.build_response_dto(proposal, requester_id=str(current_user.id))


@router.post(
    "/proposals/{proposal_id}/reject",
    response_model=TradeProposalResponse,
    summary="Rechazar una propuesta de intercambio"
)
def reject_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancela o rechaza la propuesta."""
    proposal = TradeProposalService.reject_proposal(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.build_response_dto(proposal, requester_id=str(current_user.id))


@router.post(
    "/proposals/{proposal_id}/complete",
    response_model=TradeProposalResponse,
    summary="Confirmar entrega y cerrar el intercambio"
)
def complete_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Marca el intercambio como COMPLETED, ejecuta el impacto en inventarios
    y premia la reputación de ambos participantes.
    """
    proposal = TradeProposalService.complete_trade(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.build_response_dto(proposal, requester_id=str(current_user.id))