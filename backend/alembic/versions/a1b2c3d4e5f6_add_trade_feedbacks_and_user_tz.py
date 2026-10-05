"""add_trade_feedbacks_and_user_tz

Revision ID: a1b2c3d4e5f6
Revises: f2b3c4d5e6f7
Create Date: 2026-10-05 16:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear tabla trade_feedbacks con UniqueConstraint
    op.create_table(
        'trade_feedbacks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('proposal_id', sa.String(), nullable=False),
        sa.Column('author_id', sa.String(), nullable=False),
        sa.Column('target_user_id', sa.String(), nullable=False),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('comment', sa.String(length=500), nullable=True),
        sa.Column('successful', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['proposal_id'], ['trade_proposals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('proposal_id', 'author_id', name='uq_trade_feedback_proposal_author')
    )
    op.create_index(op.f('ix_trade_feedbacks_author_id'), 'trade_feedbacks', ['author_id'], unique=False)
    op.create_index(op.f('ix_trade_feedbacks_proposal_id'), 'trade_feedbacks', ['proposal_id'], unique=False)
    op.create_index(op.f('ix_trade_feedbacks_target_user_id'), 'trade_feedbacks', ['target_user_id'], unique=False)

    # 2. Ajustar columnas de fecha en users a TIMESTAMPTZ (timezone=True)
    op.alter_column(
        'users',
        'created_at',
        existing_type=sa.DateTime(timezone=False),
        type_=sa.DateTime(timezone=True),
        existing_nullable=False
    )
    op.alter_column(
        'users',
        'otp_expires_at',
        existing_type=sa.DateTime(timezone=False),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True
    )


def downgrade() -> None:
    # 1. Revertir tipos de columna en users
    op.alter_column(
        'users',
        'otp_expires_at',
        existing_type=sa.DateTime(timezone=True),
        type_=sa.DateTime(timezone=False),
        existing_nullable=True
    )
    op.alter_column(
        'users',
        'created_at',
        existing_type=sa.DateTime(timezone=True),
        type_=sa.DateTime(timezone=False),
        existing_nullable=False
    )

    # 2. Eliminar índices y tabla trade_feedbacks
    op.drop_index(op.f('ix_trade_feedbacks_target_user_id'), table_name='trade_feedbacks')
    op.drop_index(op.f('ix_trade_feedbacks_proposal_id'), table_name='trade_feedbacks')
    op.drop_index(op.f('ix_trade_feedbacks_author_id'), table_name='trade_feedbacks')
    op.drop_table('trade_feedbacks')