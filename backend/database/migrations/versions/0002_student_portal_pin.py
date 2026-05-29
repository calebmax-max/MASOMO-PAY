"""Add portal pin hash to students

Revision ID: 0002_student_portal_pin
Revises: 0001_initial_schema
Create Date: 2026-05-29 00:00:01
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_student_portal_pin"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("students", sa.Column("portal_pin_hash", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("students", "portal_pin_hash")
