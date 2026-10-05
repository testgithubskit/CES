from sqlalchemy import String, Text, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class Operation(Base, TimestampMixin):
    __tablename__ = "operation"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("part.id"), nullable=False)
    operation_number: Mapped[str] = mapped_column(String(50), nullable=False)
    operation_name: Mapped[str] = mapped_column(String(255), nullable=False)
    work_center_id: Mapped[int] = mapped_column(Integer, ForeignKey("work_center.id"), nullable=False)
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("machine.id"), nullable=False)
    setup_time: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cycle_time: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    work_instructions: Mapped[str] = mapped_column(Text, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    part = relationship("Part", back_populates="operations")
    work_center = relationship("WorkCenter", back_populates="operations")
    machine = relationship("Machine", back_populates="operations")
    created_by_user = relationship("User", back_populates="operations_created", foreign_keys=[created_by])
    estimation_operation_costs = relationship("EstimationOperationCost", back_populates="operation")
    
    __table_args__ = (
        Index('ix_operation_part_id', 'part_id'),
        Index('ix_operation_work_center_id', 'work_center_id'),
        Index('ix_operation_machine_id', 'machine_id'),
        Index('ix_operation_operation_number', 'operation_number'),
    )
