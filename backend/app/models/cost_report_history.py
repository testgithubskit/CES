from sqlalchemy import String, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, TimestampMixin


class CostReportHistory(Base, TimestampMixin):
    __tablename__ = "cost_report_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    grand_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)

    __table_args__ = (
        Index("ix_cost_report_history_product_id", "product_id"),
    )
