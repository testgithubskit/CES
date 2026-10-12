from sqlalchemy import String, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, TimestampMixin


class ProductAdditionalCost(Base, TimestampMixin):
    __tablename__ = "product_additional_cost"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    cost_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cost_value: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)

    __table_args__ = (
        Index("ix_product_additional_cost_product_id", "product_id"),
    )
