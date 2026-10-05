from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class CostEstimation(Base, TimestampMixin):
    __tablename__ = "cost_estimation"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    estimation_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    estimation_date: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customer.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    customer = relationship("Customer", back_populates="cost_estimations")
    product = relationship("Product", back_populates="cost_estimations")
    created_by_user = relationship("User", back_populates="cost_estimations_created", foreign_keys=[created_by])
    estimation_additional_costs = relationship("EstimationAdditionalCost", back_populates="estimation")
    estimation_operation_costs = relationship("EstimationOperationCost", back_populates="estimation")
    
    __table_args__ = (
        Index('ix_cost_estimation_estimation_number', 'estimation_number'),
        Index('ix_cost_estimation_customer_id', 'customer_id'),
        Index('ix_cost_estimation_product_id', 'product_id'),
        Index('ix_cost_estimation_estimation_date', 'estimation_date'),
    )
