"""Merge migration heads

Revision ID: ba6b968346bc
Revises: 0b17cd877bcf, 2b67d2efeac2, f139458176db
Create Date: 2025-10-01 09:14:34.674007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba6b968346bc'
down_revision: Union[str, None] = ('0b17cd877bcf', '2b67d2efeac2', 'f139458176db')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
