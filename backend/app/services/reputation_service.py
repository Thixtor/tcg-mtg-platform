# app/services/reputation_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: REPUTACIÓN Y RETROALIMENTACIÓN P2P
# ---------------------------------------------------------
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.trade_proposal import TradeProposal, TradeStatus, TradeFeedback
from app.models.user import User
from app.schemas.trade import TradeFeedbackPayload


class ReputationService:
    """
    Servicio de Dominio encargado de auditar y procesar la retroalimentación
    entre usuarios tras completar intercambios, actualizando métricas de confianza.
    """

    @classmethod
    def submit_trade_feedback(
        cls,
        db: Session,
        proposal_id: str,
        author_id: str,
        payload: TradeFeedbackPayload
    ) -> dict:
        proposal = (
            db.query(TradeProposal)
            .filter(TradeProposal.id == proposal_id)
            .first()
        )
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Propuesta de intercambio no encontrada."
            )

        if str(proposal.proposer_id) != str(author_id) and str(proposal.receiver_id) != str(author_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para interactuar con esta propuesta."
            )

        if proposal.status != TradeStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo puedes calificar intercambios que se encuentren en estado 'completed'."
            )

        # Restricción de unicidad: solo una calificación por usuario por propuesta
        existing = (
            db.query(TradeFeedback)
            .filter(
                TradeFeedback.proposal_id == proposal_id,
                TradeFeedback.author_id == author_id
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya has enviado tu calificación para este intercambio."
            )

        target_user_id = str(proposal.receiver_id) if str(proposal.proposer_id) == str(author_id) else str(proposal.proposer_id)
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario destinatario no encontrado."
            )

        # Registrar el feedback
        feedback = TradeFeedback(
            proposal_id=proposal_id,
            author_id=author_id,
            target_user_id=target_user_id,
            rating=payload.rating,
            comment=payload.comment,
            successful=payload.successful
        )
        db.add(feedback)

        # Aplicar el cálculo de reputación y rating ponderado al usuario calificado
        target_user.apply_feedback(rating_value=payload.rating, successful=payload.successful)

        db.commit()
        db.refresh(target_user)

        return {
            "target_user_id": str(target_user.id),
            "target_username": target_user.username,
            "reputation_score": target_user.reputation_score,
            "rating": target_user.rating,
            "completed_trades": target_user.completed_trades,
            "disputes_count": target_user.disputes_count
        }