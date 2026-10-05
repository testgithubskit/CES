from sqlalchemy import Boolean, Integer, Numeric, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class MachineMHRValue(Base, TimestampMixin):
    __tablename__ = "machine_mhr_value"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("machine.id"), nullable=False)
    particular_id: Mapped[int] = mapped_column(Integer, ForeignKey("mhr_particular.id"), nullable=False)
    is_applicable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    input_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    computed_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    updated_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    machine = relationship("Machine", back_populates="machine_mhr_values")
    particular = relationship("MHRParticular", back_populates="machine_mhr_values")
    updated_by_user = relationship("User", back_populates="machine_mhr_values_updated", foreign_keys=[updated_by])
    
    __table_args__ = (
        UniqueConstraint('machine_id', 'particular_id', name='uq_machine_particular'),
        Index('ix_machine_mhr_value_machine_id', 'machine_id'),
        Index('ix_machine_mhr_value_particular_id', 'particular_id'),
    )
