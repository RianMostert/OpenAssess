"""simple_role_restructure

Revision ID: 0b17cd877bcf
Revises: a6035079f22e
Create Date: 2025-09-30 11:49:52.649892

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b17cd877bcf'
down_revision: Union[str, None] = 'a6035079f22e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new primary_role table
    op.create_table('primary_role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_primary_role_id'), 'primary_role', ['id'], unique=False)
    
    # Create new course_role table
    op.create_table('course_role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_course_role_id'), 'course_role', ['id'], unique=False)
    
    # Seed primary roles
    op.execute("""
        INSERT INTO primary_role (id, name) VALUES 
        (1, 'administrator'),
        (2, 'staff'),
        (3, 'student')
    """)
    
    # Seed course roles
    op.execute("""
        INSERT INTO course_role (id, name) VALUES 
        (1, 'convener'),
        (2, 'facilitator'),
        (3, 'student')
    """)
    
    # Update user table foreign key to point to primary_role
    op.drop_constraint('user_primary_role_id_fkey', 'user', type_='foreignkey')
    op.create_foreign_key(None, 'user', 'primary_role', ['primary_role_id'], ['id'])
    
    # Update user_course_role table
    op.add_column('user_course_role', sa.Column('course_role_id', sa.Integer(), nullable=False, default=3))
    op.drop_constraint('user_course_role_role_id_fkey', 'user_course_role', type_='foreignkey')
    op.create_foreign_key(None, 'user_course_role', 'course_role', ['course_role_id'], ['id'], ondelete='CASCADE')
    op.drop_column('user_course_role', 'role_id')
    op.drop_column('user_course_role', 'is_convener')
    
    # Drop the old role table
    op.drop_table('role')


def downgrade() -> None:
    # Recreate role table
    op.create_table('role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Restore user_course_role structure
    op.add_column('user_course_role', sa.Column('role_id', sa.Integer(), nullable=False))
    op.add_column('user_course_role', sa.Column('is_convener', sa.Boolean(), default=False, nullable=False))
    op.drop_constraint(None, 'user_course_role', type_='foreignkey')
    op.create_foreign_key('user_course_role_role_id_fkey', 'user_course_role', 'role', ['role_id'], ['id'])
    op.drop_column('user_course_role', 'course_role_id')
    
    # Restore user foreign key
    op.drop_constraint(None, 'user', type_='foreignkey')
    op.create_foreign_key('user_primary_role_id_fkey', 'user', 'role', ['primary_role_id'], ['id'])
    
    # Drop new tables
    op.drop_table('course_role')
    op.drop_table('primary_role')
