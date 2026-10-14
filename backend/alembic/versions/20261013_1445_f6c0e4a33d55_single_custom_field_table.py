"""Single custom field table for every record type

Revision ID: f6c0e4a33d55
Revises: e5b9d3f22c44
Create Date: 2026-10-13 14:45:00

"""
from alembic import op
import sqlalchemy as sa


revision = "f6c0e4a33d55"
down_revision = "e5b9d3f22c44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_field",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("field_key", sa.String(length=40), nullable=False),
        sa.Column("label", sa.String(length=40), nullable=False),
        sa.Column("field_type", sa.String(length=20), nullable=False),
        sa.Column("max_length", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_custom_field_definition",
        "custom_field",
        ["entity_type", "field_key"],
        unique=True,
        postgresql_where=sa.text("entity_id IS NULL"),
    )
    op.create_index(
        "uq_custom_field_value",
        "custom_field",
        ["entity_type", "entity_id", "field_key"],
        unique=True,
        postgresql_where=sa.text("entity_id IS NOT NULL"),
    )
    op.create_index("ix_custom_field_entity", "custom_field", ["entity_type", "entity_id"])
    op.execute(
        """
        INSERT INTO custom_field (entity_type, entity_id, field_key, label, field_type, max_length, sort_order, value, created_at, updated_at)
        SELECT 'product', NULL, field_key, label, field_type, max_length, sort_order, NULL, created_at, updated_at
        FROM product_field
        """
    )
    op.execute(
        """
        INSERT INTO custom_field (entity_type, entity_id, field_key, label, field_type, max_length, sort_order, value, created_at, updated_at)
        SELECT 'product', v.product_id, f.field_key, f.label, f.field_type, f.max_length, f.sort_order, v.value, v.created_at, v.updated_at
        FROM product_field_value AS v
        JOIN product_field AS f ON f.id = v.field_id
        """
    )
    op.drop_table("product_field_value")
    op.drop_table("product_field")


def downgrade() -> None:
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
    op.drop_index("ix_custom_field_entity", table_name="custom_field")
    op.drop_index("uq_custom_field_value", table_name="custom_field")
    op.drop_index("uq_custom_field_definition", table_name="custom_field")
    op.drop_table("custom_field")
