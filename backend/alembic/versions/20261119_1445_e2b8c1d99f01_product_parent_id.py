"""Product parent id for versioning

Revision ID: e2b8c1d99f01
Revises: d1a4b7c88e90
Create Date: 2026-11-19 14:45:00

"""
from alembic import op
import sqlalchemy as sa


revision = "e2b8c1d99f01"
down_revision = "d1a4b7c88e90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("product", sa.Column("parent_product_id", sa.Integer(), nullable=True))
    op.create_index("ix_product_parent_product_id", "product", ["parent_product_id"])
    op.create_foreign_key(
        "fk_product_parent_product_id",
        "product",
        "product",
        ["parent_product_id"],
        ["id"],
        ondelete="SET NULL",
    )

    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, product_number, version FROM product ORDER BY id")
    ).fetchall()
    groups = {}
    for row in rows:
        groups.setdefault(row.product_number, []).append(row)

    def is_first(version):
        text = str(version or "").strip().lower()
        if text.startswith("v"):
            text = text[1:].strip()
        return text == "1"

    for members in groups.values():
        if len(members) < 2:
            continue
        root = next((item for item in members if is_first(item.version)), members[0])
        for item in members:
            if item.id == root.id:
                continue
            connection.execute(
                sa.text("UPDATE product SET parent_product_id = :parent WHERE id = :id"),
                {"parent": root.id, "id": item.id},
            )


def downgrade() -> None:
    op.drop_constraint("fk_product_parent_product_id", "product", type_="foreignkey")
    op.drop_index("ix_product_parent_product_id", table_name="product")
    op.drop_column("product", "parent_product_id")
