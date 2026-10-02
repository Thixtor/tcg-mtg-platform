# alembic/versions/f2b3c4d5e6f7_add_cascade_to_decks_and_deck_cards.py
# --------------------------------------------------------------------------
# MIGRACIÓN: AÑADIR ON DELETE CASCADE A DECKS Y DECK_CARDS
# --------------------------------------------------------------------------
"""add_cascade_to_decks_and_deck_cards

Revision ID: f2b3c4d5e6f7
Revises: e1a2b3c4d5e6
Create Date: 2026-10-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f2b3c4d5e6f7'
down_revision: Union[str, None] = 'e1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. decks: FK user_id con ON DELETE CASCADE
    op.drop_constraint('decks_user_id_fkey', 'decks', type_='foreignkey')
    op.create_foreign_key(
        'decks_user_id_fkey',
        'decks', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )

    # 2. deck_cards: FK deck_id con ON DELETE CASCADE
    op.drop_constraint('deck_cards_deck_id_fkey', 'deck_cards', type_='foreignkey')
    op.create_foreign_key(
        'deck_cards_deck_id_fkey',
        'deck_cards', 'decks',
        ['deck_id'], ['id'],
        ondelete='CASCADE'
    )

    # 3. deck_cards: FK scryfall_card_id con ON DELETE CASCADE
    op.drop_constraint('deck_cards_scryfall_card_id_fkey', 'deck_cards', type_='foreignkey')
    op.create_foreign_key(
        'deck_cards_scryfall_card_id_fkey',
        'deck_cards', 'cartas',
        ['scryfall_card_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    pass