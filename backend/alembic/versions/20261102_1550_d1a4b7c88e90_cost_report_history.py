"""Saved cost report downloads

Revision ID: d1a4b7c88e90
Revises: c9f3d0e66g88
Create Date: 2026-11-02 15:50:00

"""
from alembic import op
import sqlalchemy as sa


revision = "d1a4b7c88e90"
down_revision = "c9f3d0e66g88"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cost_report_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("grand_total", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cost_report_history_product_id", "cost_report_history", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_cost_report_history_product_id", table_name="cost_report_history")
    op.drop_table("cost_report_history")
