"""Shared report templates

Revision ID: b8e2c9d55f77
Revises: a7d1b5c44e66
Create Date: 2026-10-23 11:48:00

"""
from alembic import op
import sqlalchemy as sa


revision = "b8e2c9d55f77"
down_revision = "a7d1b5c44e66"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_template",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("template_data", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("report_template")
