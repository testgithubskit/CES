from sqlalchemy import Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class EstimationOperationCost(Base, TimestampMixin):
    __tablename__ = "estimation_operation_cost"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    estimation_id: Mapped[int] = mapped_column(Integer, ForeignKey("cost_estimation.id"), nullable=False)
    operation_id: Mapped[int] = mapped_column(Integer, ForeignKey("operation.id"), nullable=False)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("part.id"), nullable=False)
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("machine.id"), nullable=False)
    setup_hours: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cycle_hours: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    part_quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_hours: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    mhr_rate_snapshot: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    machining_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    # Relationships
    estimation = relationship("CostEstimation", back_populates="estimation_operation_costs")
    operation = relationship("Operation", back_populates="estimation_operation_costs")
    part = relationship("Part", back_populates="estimation_operation_costs")
    machine = relationship("Machine", back_populates="estimation_operation_costs")
    
    __table_args__ = (
        Index('ix_estimation_operation_cost_estimation_id', 'estimation_id'),
        Index('ix_estimation_operation_cost_operation_id', 'operation_id'),
        Index('ix_estimation_operation_cost_part_id', 'part_id'),
        Index('ix_estimation_operation_cost_machine_id', 'machine_id'),
    )
