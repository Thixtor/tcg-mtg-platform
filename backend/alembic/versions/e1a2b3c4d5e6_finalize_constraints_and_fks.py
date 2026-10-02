# alembic/versions/e1a2b3c4d5e6_finalize_constraints_and_fks.py
# --------------------------------------------------------------------------
# MIGRACIÓN: ALINEACIÓN FINAL DE FKs, CASCADE, ÍNDICES Y RESTRECCIÓN WISHLIST
# --------------------------------------------------------------------------
"""finalize_constraints_and_fks

Revision ID: e1a2b3c4d5e6
Revises: d9f10283c44a
Create Date: 2026-10-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, None] = 'd9f10283c44a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. cartas: color_identity NOT NULL e índice
    op.execute("UPDATE cartas SET color_identity = '' WHERE color_identity IS NULL;")
    op.alter_column('cartas', 'color_identity', nullable=False)
    op.create_index('ix_cartas_color_identity', 'cartas', ['color_identity'], if_not_exists=True)

    # 2. user_cards: created_at a TIMESTAMP WITH TIME ZONE
    op.execute(
        "ALTER TABLE user_cards ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC';"
    )
    op.alter_column('user_cards', 'created_at', nullable=False)

    # 3. collections: FK user_id con ON DELETE CASCADE
    op.drop_constraint('collections_user_id_fkey', 'collections', type_='foreignkey')
    op.create_foreign_key(
        'collections_user_id_fkey',
        'collections', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )

    # 4. user_cards: FKs con ON DELETE CASCADE
    op.drop_constraint('user_cards_collection_id_fkey', 'user_cards', type_='foreignkey')
    op.create_foreign_key(
        'user_cards_collection_id_fkey',
        'user_cards', 'collections',
        ['collection_id'], ['id'],
        ondelete='CASCADE'
    )
    op.drop_constraint('user_cards_scryfall_card_id_fkey', 'user_cards', type_='foreignkey')
    op.create_foreign_key(
        'user_cards_scryfall_card_id_fkey',
        'user_cards', 'cartas',
        ['scryfall_card_id'], ['id'],
        ondelete='CASCADE'
    )

    # 5. trade_proposals: normalizar nombres de índices esperados por Alembic
    op.drop_index('ix_trade_proposals_proposer', table_name='trade_proposals', if_exists=True)
    op.drop_index('ix_trade_proposals_receiver', table_name='trade_proposals', if_exists=True)
    op.create_index('ix_trade_proposals_proposer_id', 'trade_proposals', ['proposer_id'], if_not_exists=True)
    op.create_index('ix_trade_proposals_receiver_id', 'trade_proposals', ['receiver_id'], if_not_exists=True)

    # 6. trade_proposal_items: normalizar índice de propuesta
    op.drop_index('ix_trade_proposal_items_proposal', table_name='trade_proposal_items', if_exists=True)
    op.create_index('ix_trade_proposal_items_proposal_id', 'trade_proposal_items', ['proposal_id'], if_not_exists=True)

    # 7. wishlist_items: alinear nombre de la restricción Unique
    op.drop_constraint('uq_wishlist_user_card', 'wishlist_items', type_='unique')
    op.create_unique_constraint('uq_user_wishlist_card', 'wishlist_items', ['user_id', 'scryfall_card_id'])


def downgrade():
    pass