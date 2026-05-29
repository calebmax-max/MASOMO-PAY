"""Initial schema

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-05-29 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "schools",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=120), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=True),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("admission_no", sa.String(length=80), nullable=False),
        sa.Column("class_name", sa.String(length=80), nullable=False),
        sa.Column("parent_phone", sa.String(length=20), nullable=True),
        sa.Column("balance", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=True),
        sa.UniqueConstraint("admission_no", name="uq_students_admission_no"),
    )
    op.create_index("ix_students_admission_no", "students", ["admission_no"], unique=False)
    op.create_table(
        "fee_structures",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_name", sa.String(length=80), nullable=False),
        sa.Column("term", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=True),
        sa.UniqueConstraint("class_name", "term", "school_id", name="uq_fee_structure"),
    )
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=True),
        sa.Column("school_id", sa.Integer(), sa.ForeignKey("schools.id"), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=False),
        sa.Column("mpesa_code", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("recorded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("mpesa_code", name="uq_payments_mpesa_code"),
    )
    op.create_index("ix_payments_mpesa_code", "payments", ["mpesa_code"], unique=False)


def downgrade():
    op.drop_index("ix_payments_mpesa_code", table_name="payments")
    op.drop_table("payments")
    op.drop_table("fee_structures")
    op.drop_index("ix_students_admission_no", table_name="students")
    op.drop_table("students")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("schools")

