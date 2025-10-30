"""modify_mark_query_multiple_questions

Revision ID: 2b67d2efeac2
Revises: a6035079f22e
Create Date: 2025-09-29 23:24:44.534609

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b67d2efeac2'
down_revision: Union[str, None] = 'a6035079f22e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create junction table for mark_query and questions many-to-many relationship
    op.create_table('mark_query_questions',
        sa.Column('mark_query_id', sa.UUID(), nullable=False),
        sa.Column('question_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['mark_query_id'], ['mark_query.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['question.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('mark_query_id', 'question_id')
    )

    # Remove columns that are no longer needed from mark_query table
    op.drop_column('mark_query', 'question_id')
    op.drop_column('mark_query', 'current_mark')
    op.drop_column('mark_query', 'query_type')
    op.drop_column('mark_query', 'new_mark')

    # Drop the old query_type constraint
    op.drop_constraint('check_query_type', 'mark_query', type_='check')


def downgrade() -> None:
    # Recreate the dropped columns
    op.add_column('mark_query', sa.Column('question_id', sa.UUID(), nullable=True))
    op.add_column('mark_query', sa.Column('current_mark', sa.Float(), nullable=True))
    op.add_column('mark_query', sa.Column('query_type', sa.String(), nullable=False, server_default='regrade'))
    op.add_column('mark_query', sa.Column('new_mark', sa.Float(), nullable=True))

    # Recreate foreign key constraint for question_id
    op.create_foreign_key(None, 'mark_query', 'question', ['question_id'], ['id'], ondelete='CASCADE')

    # Recreate the query_type constraint
    op.create_check_constraint('check_query_type', 'mark_query', "query_type IN ('regrade', 'clarification', 'technical_issue')")

    # Drop junction table
    op.drop_table('mark_query_questions')
