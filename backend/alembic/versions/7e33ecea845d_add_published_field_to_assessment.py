"""add_published_field_to_assessment

Revision ID: 7e33ecea845d
Revises: 59fad406620a
Create Date: 2025-09-10 21:49:24.914443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e33ecea845d'
down_revision: Union[str, None] = '59fad406620a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add published column to assessment table
    op.add_column('assessment', sa.Column('published', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove published column from assessment table
    op.drop_column('assessment', 'published')
