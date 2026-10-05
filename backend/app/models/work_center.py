from sqlalchemy import String, Boolean, Integer, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class WorkCenter(Base, TimestampMixin):
    __tablename__ = "work_center"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Relationships
    machines = relationship("Machine", back_populates="work_center")
    operations = relationship("Operation", back_populates="work_center")
    
    __table_args__ = (
        Index('ix_work_center_code', 'code'),
        Index('ix_work_center_is_active', 'is_active'),
    )
