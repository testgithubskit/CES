"""Add product quantity and operation process-plan fields

Revision ID: b7c1e2a90f11
Revises: 528d883a84f1
Create Date: 2026-10-09 12:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = "b7c1e2a90f11"
down_revision = "528d883a84f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product",
        sa.Column("quantity", sa.Numeric(precision=10, scale=2), nullable=False, server_default="1"),
    )
    op.alter_column("product", "version", server_default="1")
    op.execute("UPDATE product SET version = '1' WHERE version IS NULL")
    op.alter_column("product", "version", existing_type=sa.String(length=50), nullable=False)

    op.drop_column("assembly", "description")

    op.add_column(
        "operation",
        sa.Column("operation_type", sa.String(length=50), nullable=False, server_default="in_house"),
    )
    op.drop_column("operation", "sequence_no")
    op.alter_column(
        "operation",
        "setup_time",
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.String(length=20),
        postgresql_using="setup_time::text",
        existing_nullable=False,
    )
    op.alter_column(
        "operation",
        "cycle_time",
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.String(length=20),
        postgresql_using="cycle_time::text",
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "operation",
        "cycle_time",
        existing_type=sa.String(length=20),
        type_=sa.Numeric(precision=10, scale=2),
        postgresql_using="NULL",
        existing_nullable=False,
    )
    op.alter_column(
        "operation",
        "setup_time",
        existing_type=sa.String(length=20),
        type_=sa.Numeric(precision=10, scale=2),
        postgresql_using="NULL",
        existing_nullable=False,
    )
    op.add_column("operation", sa.Column("sequence_no", sa.Integer(), nullable=True))
    op.drop_column("operation", "operation_type")
    op.add_column("assembly", sa.Column("description", sa.Text(), nullable=True))
    op.alter_column("product", "version", existing_type=sa.String(length=50), nullable=True)
    op.drop_column("product", "quantity")
