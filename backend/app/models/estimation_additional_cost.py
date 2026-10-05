from sqlalchemy import String, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class EstimationAdditionalCost(Base, TimestampMixin):
    __tablename__ = "estimation_additional_cost"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    estimation_id: Mapped[int] = mapped_column(Integer, ForeignKey("cost_estimation.id"), nullable=False)
    cost_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cost_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    estimation = relationship("CostEstimation", back_populates="estimation_additional_costs")
    user = relationship("User", back_populates="estimation_additional_costs")
    
    __table_args__ = (
        Index('ix_estimation_additional_cost_estimation_id', 'estimation_id'),
    )
