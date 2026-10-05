from sqlalchemy import String, Boolean, Integer, Text, Numeric, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class Machine(Base, TimestampMixin):
    __tablename__ = "machine"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_center_id: Mapped[int] = mapped_column(Integer, ForeignKey("work_center.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    machine_code: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=True)
    make: Mapped[str] = mapped_column(String(100), nullable=True)
    model: Mapped[str] = mapped_column(String(100), nullable=True)
    year_of_installation: Mapped[int] = mapped_column(Integer, nullable=True)
    remarks: Mapped[str] = mapped_column(Text, nullable=True)
    mhr: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    recommended_mhr: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    mhr_calculated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    mhr_updated_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Relationships
    work_center = relationship("WorkCenter", back_populates="machines")
    mhr_updated_by_user = relationship("User", back_populates="machines_mhr_updated", foreign_keys=[mhr_updated_by])
    machine_mhr_values = relationship("MachineMHRValue", back_populates="machine")
    operations = relationship("Operation", back_populates="machine")
    estimation_operation_costs = relationship("EstimationOperationCost", back_populates="machine")
    
    __table_args__ = (
        Index('ix_machine_work_center_id', 'work_center_id'),
        Index('ix_machine_machine_code', 'machine_code'),
        Index('ix_machine_is_active', 'is_active'),
    )
