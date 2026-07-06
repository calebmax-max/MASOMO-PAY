"""Link fee structures to academic terms

Revision ID: 0004_fee_structure_term_relation
Revises: 0003_academic_terms
Create Date: 2026-07-06 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = '0004_fee_structure_term_relation'
down_revision = '0003_academic_terms'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('fee_structures', sa.Column('academic_term_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_fee_structures_academic_term', 'fee_structures', 'academic_terms', ['academic_term_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_fee_structures_academic_term', 'fee_structures', type_='foreignkey')
    op.drop_column('fee_structures', 'academic_term_id')
