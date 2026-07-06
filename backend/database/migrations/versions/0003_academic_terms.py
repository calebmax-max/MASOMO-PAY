"""Add academic terms for date-based term switching

Revision ID: 0003_academic_terms
Revises: 0002_student_portal_pin
Create Date: 2026-07-06 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = '0003_academic_terms'
down_revision = '0002_student_portal_pin'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'academic_terms',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('school_id', sa.Integer(), sa.ForeignKey('schools.id'), nullable=True),
        sa.UniqueConstraint('name', 'school_id', name='uq_academic_term'),
    )


def downgrade():
    op.drop_table('academic_terms')
