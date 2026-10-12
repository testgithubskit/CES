"""Product additional costs

Revision ID: d4a8c2e11b33
Revises: c8e4a1d70f22
Create Date: 2026-10-12 10:30:00

"""
from alembic import op
import sqlalchemy as sa


revision = "d4a8c2e11b33"
down_revision = "c8e4a1d70f22"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_additional_cost",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("cost_name", sa.String(length=255), nullable=False),
        sa.Column("cost_value", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_additional_cost_product_id", "product_additional_cost", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_product_additional_cost_product_id", table_name="product_additional_cost")
    op.drop_table("product_additional_cost")
