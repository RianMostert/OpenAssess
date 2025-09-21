"""add_mark_query_table

Revision ID: a6035079f22e
Revises: e7d5748eb74f
Create Date: 2025-09-21 20:53:00.142573

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6035079f22e'
down_revision: Union[str, None] = 'e7d5748eb74f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create mark_query table
    op.create_table('mark_query',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('student_id', sa.UUID(), nullable=False),
    sa.Column('assessment_id', sa.UUID(), nullable=False),
    sa.Column('question_id', sa.UUID(), nullable=True),
    sa.Column('current_mark', sa.Float(), nullable=True),
    sa.Column('requested_change', sa.Text(), nullable=False),
    sa.Column('query_type', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False, server_default='pending'),
    sa.Column('reviewer_id', sa.UUID(), nullable=True),
    sa.Column('reviewer_response', sa.Text(), nullable=True),
    sa.Column('new_mark', sa.Float(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessment.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['question_id'], ['question.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['reviewer_id'], ['user.id']),
    sa.ForeignKeyConstraint(['student_id'], ['user.id']),
    sa.PrimaryKeyConstraint('id'),
    sa.CheckConstraint("query_type IN ('regrade', 'clarification', 'technical_issue')", name='check_query_type'),
    sa.CheckConstraint("status IN ('pending', 'under_review', 'approved', 'rejected', 'resolved')", name='check_status')
    )
    
    # Create indexes for better performance
    op.create_index('ix_mark_query_student_id', 'mark_query', ['student_id'])
    op.create_index('ix_mark_query_assessment_id', 'mark_query', ['assessment_id'])
    op.create_index('ix_mark_query_status', 'mark_query', ['status'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_mark_query_status', table_name='mark_query')
    op.drop_index('ix_mark_query_assessment_id', table_name='mark_query')
    op.drop_index('ix_mark_query_student_id', table_name='mark_query')
    
    # Drop table
    op.drop_table('mark_query')
