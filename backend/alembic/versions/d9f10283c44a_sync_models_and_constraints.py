# alembic/versions/d9f10283c44a_sync_models_and_constraints.py
# --------------------------------------------------------------------------
# MIGRACIÓN: AJUSTE DE CONSTRAINTS, NULABILIDAD Y TIPOS RESTANTES
# --------------------------------------------------------------------------
"""sync_models_and_constraints

Revision ID: d9f10283c44a
Revises: c5e82194b1a2
Create Date: 2026-10-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd9f10283c44a'
down_revision: Union[str, None] = 'c5e82194b1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Columna color_identity e índices en cartas
    op.execute(
        "ALTER TABLE cartas ADD COLUMN IF NOT EXISTS color_identity VARCHAR DEFAULT '' NOT NULL;"
    )

    # 2. Ajuste de tipo en trade_proposal_items
    op.execute(
        "ALTER TABLE trade_proposal_items ALTER COLUMN quantity TYPE INTEGER USING quantity::integer;"
    )

    # 3. Nulabilidades identificadas por alembic check
    op.execute("UPDATE deck_cards SET category = 'mainboard' WHERE category IS NULL;")
    op.alter_column('deck_cards', 'category', nullable=False)

    op.execute("UPDATE decks SET format = 'commander' WHERE format IS NULL;")
    op.alter_column('decks', 'format', nullable=False)

    op.execute("UPDATE user_cards SET condition = 'NM' WHERE condition IS NULL;")
    op.alter_column('user_cards', 'condition', nullable=False)

    op.execute("UPDATE user_cards SET language = 'EN' WHERE language IS NULL;")
    op.alter_column('user_cards', 'language', nullable=False)

    op.execute("UPDATE user_cards SET is_foil = false WHERE is_foil IS NULL;")
    op.alter_column('user_cards', 'is_foil', nullable=False)

    op.execute("UPDATE user_cards SET is_for_trade = false WHERE is_for_trade IS NULL;")
    op.alter_column('user_cards', 'is_for_trade', nullable=False)

    op.execute("UPDATE users SET preferred_currency = 'COP' WHERE preferred_currency IS NULL;")
    op.alter_column('users', 'preferred_currency', nullable=False)

    op.execute("UPDATE users SET allows_local_meetup = true WHERE allows_local_meetup IS NULL;")
    op.alter_column('users', 'allows_local_meetup', nullable=False)

    op.execute("UPDATE users SET allows_nationwide_shipping = true WHERE allows_nationwide_shipping IS NULL;")
    op.alter_column('users', 'allows_nationwide_shipping', nullable=False)

    op.execute("UPDATE users SET reputation_score = 100 WHERE reputation_score IS NULL;")
    op.alter_column('users', 'reputation_score', nullable=False)

    op.execute("UPDATE users SET rating = 5.0 WHERE rating IS NULL;")
    op.alter_column('users', 'rating', nullable=False)

    op.execute("UPDATE users SET completed_trades = 0 WHERE completed_trades IS NULL;")
    op.alter_column('users', 'completed_trades', nullable=False)

    op.execute("UPDATE users SET disputes_count = 0 WHERE disputes_count IS NULL;")
    op.alter_column('users', 'disputes_count', nullable=False)

    op.execute("UPDATE wishlist_items SET priority = 'medium' WHERE priority IS NULL;")
    op.alter_column('wishlist_items', 'priority', nullable=False)


def downgrade():
    pass