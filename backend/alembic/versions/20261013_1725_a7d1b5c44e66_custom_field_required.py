"""Custom column required flag

Revision ID: a7d1b5c44e66
Revises: f6c0e4a33d55
Create Date: 2026-10-13 17:25:00

"""
from alembic import op
import sqlalchemy as sa


revision = "a7d1b5c44e66"
down_revision = "f6c0e4a33d55"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "custom_field",
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("custom_field", "is_required")
