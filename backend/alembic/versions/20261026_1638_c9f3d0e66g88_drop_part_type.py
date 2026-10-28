"""Remove part type from parts

Revision ID: c9f3d0e66g88
Revises: b8e2c9d55f77
Create Date: 2026-10-26 16:38:00

"""
from alembic import op
import sqlalchemy as sa


revision = "c9f3d0e66g88"
down_revision = "b8e2c9d55f77"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    fks = inspector.get_foreign_keys("part")
    for fk in fks:
        if "part_type_id" in fk.get("constrained_columns", []):
            op.drop_constraint(fk["name"], "part", type_="foreignkey")
    indexes = inspector.get_indexes("part")
    if any(index.get("name") == "ix_part_part_type_id" for index in indexes):
        op.drop_index("ix_part_part_type_id", table_name="part")
    columns = [column["name"] for column in inspector.get_columns("part")]
    if "part_type_id" in columns:
        op.drop_column("part", "part_type_id")
    if "part_type" in inspector.get_table_names():
        type_indexes = inspector.get_indexes("part_type")
        if any(index.get("name") == "ix_part_type_name" for index in type_indexes):
            op.drop_index("ix_part_type_name", table_name="part_type")
        op.drop_table("part_type")


def downgrade() -> None:
    op.create_table(
        "part_type",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_part_type_name", "part_type", ["name"], unique=False)
    op.add_column("part", sa.Column("part_type_id", sa.Integer(), nullable=True))
    op.create_foreign_key("part_part_type_id_fkey", "part", "part_type", ["part_type_id"], ["id"])
    op.create_index("ix_part_part_type_id", "part", ["part_type_id"], unique=False)
