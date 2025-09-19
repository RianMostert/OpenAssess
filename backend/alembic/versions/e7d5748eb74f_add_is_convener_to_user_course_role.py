"""Add is_convener to user_course_role

Revision ID: e7d5748eb74f
Revises: 7e33ecea845d
Create Date: 2025-09-15 21:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e7d5748eb74f'
down_revision: Union[str, None] = '7e33ecea845d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_convener column to user_course_role
    op.add_column('user_course_role', sa.Column('is_convener', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove is_convener column from user_course_role
    op.drop_column('user_course_role', 'is_convener')