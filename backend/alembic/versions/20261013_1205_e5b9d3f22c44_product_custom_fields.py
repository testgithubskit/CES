"""Product custom fields and created-by backfill

Revision ID: e5b9d3f22c44
Revises: d4a8c2e11b33
Create Date: 2026-10-13 12:05:00

"""
from alembic import op
import sqlalchemy as sa


revision = "e5b9d3f22c44"
down_revision = "d4a8c2e11b33"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_field",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("label", sa.String(length=40), nullable=False),
        sa.Column("field_key", sa.String(length=40), nullable=False),
        sa.Column("field_type", sa.String(length=20), nullable=False),
        sa.Column("max_length", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("field_key"),
    )
    op.create_table(
        "product_field_value",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("field_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["field_id"], ["product_field.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["product.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "field_id", name="uq_product_field_value"),
    )
    op.execute(
        """
        WITH numbered_products AS (
            SELECT id, (row_number() OVER (ORDER BY id) - 1) AS rn
            FROM product
            WHERE created_by IS NULL
        ),
        numbered_users AS (
            SELECT id, (row_number() OVER (ORDER BY id) - 1) AS rn,
                   count(*) OVER () AS total
            FROM "user"
            WHERE is_active IS TRUE
        )
        UPDATE product AS p
        SET created_by = u.id
        FROM numbered_products AS np
        JOIN numbered_users AS u ON u.rn = MOD(np.rn, u.total)
        WHERE p.id = np.id
          AND u.total > 0
        """
    )


def downgrade() -> None:
    op.drop_table("product_field_value")
    op.drop_table("product_field")
