# app/routers/trade.py
# ---------------------------------------------------------
# ROUTER: INTERCAMBIOS P2P, PROPUESTAS Y REPUTACIÓN
# ---------------------------------------------------------
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.trade import (
    TradeMarketItemResponse,
    TradeProposalCreatePayload,
    TradeProposalResponse,
    TradeFeedbackPayload
)
from app.services.trade_market_service import TradeMarketService
from app.services.trade_proposal_service import TradeProposalService
from app.services.reputation_service import ReputationService

router = APIRouter(
    tags=["Intercambios P2P y Sistema de Reputación"]
)


# ---------------------------------------------------------
# 1. TRADEWALL / MURO PÚBLICO
# ---------------------------------------------------------
@router.get(
    "/trade/market",
    response_model=List[TradeMarketItemResponse],
    summary="Listar cartas públicas marcadas para intercambio en la comunidad"
)
def get_trade_market(
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return TradeMarketService.get_public_trade_items(db=db, limit=limit, offset=offset)


# ---------------------------------------------------------
# 2. GESTIÓN DE PROPUESTAS DE TRADE (P2P)
# ---------------------------------------------------------
@router.post(
    "/trade/proposals",
    response_model=TradeProposalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar una nueva propuesta formal de intercambio a otro usuario"
)
def create_proposal(
    payload: TradeProposalCreatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = TradeProposalService.create_proposal(
        db=db,
        proposer=current_user,
        payload=payload
    )
    return TradeProposalService.map_proposal_to_dto(proposal)


@router.get(
    "/trade/proposals/me",
    response_model=List[TradeProposalResponse],
    summary="Consultar todas las propuestas donde participa el usuario actual"
)
def get_my_proposals(
    status: Optional[str] = Query(None, description="Filtrar por estado (proposed, accepted, completed, rejected, cancelled)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposals = TradeProposalService.get_user_proposals(
        db=db,
        user_id=str(current_user.id),
        status_filter=status
    )
    return [TradeProposalService.map_proposal_to_dto(p) for p in proposals]


@router.get(
    "/trade/proposals/{proposal_id}",
    response_model=TradeProposalResponse,
    summary="Consultar el detalle de una propuesta específica"
)
def get_proposal_detail(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = TradeProposalService.get_proposal_by_id_or_fail(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.map_proposal_to_dto(proposal)


# ---------------------------------------------------------
# 3. ACCIONES Y TRANSICIONES DE ESTADO (FSM)
# ---------------------------------------------------------
@router.post(
    "/trade/proposals/{proposal_id}/accept",
    response_model=TradeProposalResponse,
    summary="Aceptar una propuesta recibida (solo receptor)"
)
def accept_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = TradeProposalService.accept_proposal(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.map_proposal_to_dto(proposal)


@router.post(
    "/trade/proposals/{proposal_id}/reject",
    response_model=TradeProposalResponse,
    summary="Rechazar una propuesta (cualquiera de las partes)"
)
def reject_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = TradeProposalService.reject_proposal(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.map_proposal_to_dto(proposal)


@router.post(
    "/trade/proposals/{proposal_id}/cancel",
    response_model=TradeProposalResponse,
    summary="Cancelar una propuesta enviada (solo proponente original)"
)
def cancel_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = TradeProposalService.cancel_proposal(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.map_proposal_to_dto(proposal)


@router.post(
    "/trade/proposals/{proposal_id}/complete",
    response_model=TradeProposalResponse,
    summary="Marcar intercambio como completado (transfiere cartas y añade reputación)"
)
def complete_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = TradeProposalService.complete_trade(
        db=db,
        proposal_id=proposal_id,
        user_id=str(current_user.id)
    )
    return TradeProposalService.map_proposal_to_dto(proposal)


# ---------------------------------------------------------
# 4. CALIFICACIÓN Y PUNTUACIÓN DE REPUTACIÓN
# ---------------------------------------------------------
@router.post(
    "/trade/proposals/{proposal_id}/feedback",
    summary="Enviar calificación única y actualizar atómicamente la reputación de la contraparte"
)
def submit_trade_feedback(
    proposal_id: str,
    payload: TradeFeedbackPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ReputationService.submit_trade_feedback(
        db=db,
        proposal_id=proposal_id,
        author_id=str(current_user.id),
        payload=payload
    )