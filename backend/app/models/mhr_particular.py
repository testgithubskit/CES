from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class MHRParticular(Base, TimestampMixin):
    __tablename__ = "mhr_particular"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_input: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    formula: Mapped[str] = mapped_column(Text, nullable=True)
    default_sequence: Mapped[int] = mapped_column(Integer, nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    created_by_user = relationship("User", back_populates="mhr_particulars_created", foreign_keys=[created_by])
    machine_mhr_values = relationship("MachineMHRValue", back_populates="particular")
    
    __table_args__ = (
        Index('ix_mhr_particular_code', 'code'),
        Index('ix_mhr_particular_is_active', 'is_active'),
    )
