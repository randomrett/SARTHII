"""Add user role column to users table

Revision ID: 001_add_user_role
Revises: 
Create Date: 2026-09-27 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_add_user_role'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Check if role column exists or add it
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')] if inspector.has_table('users') else []
    
    if 'users' in inspector.get_table_names() and 'role' not in columns:
        op.add_column('users', sa.Column('role', sa.String(), server_default='field_worker', nullable=False))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'users' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('users')]
        if 'role' in columns:
            op.drop_column('users', 'role')
