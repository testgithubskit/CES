"""Add CNC controller fields on machines

Revision ID: c8e4a1d70f22
Revises: b7c1e2a90f11
Create Date: 2026-10-09 11:36:00

"""
from alembic import op
import sqlalchemy as sa


revision = "c8e4a1d70f22"
down_revision = "b7c1e2a90f11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("machine", sa.Column("cnc_controller", sa.String(length=255), nullable=True))
    op.add_column("machine", sa.Column("cnc_controller_service", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("machine", "cnc_controller_service")
    op.drop_column("machine", "cnc_controller")
