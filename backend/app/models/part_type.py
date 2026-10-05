from sqlalchemy import String, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class PartType(Base, TimestampMixin):
    __tablename__ = "part_type"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    created_by_user = relationship("User", back_populates="part_types_created", foreign_keys=[created_by])
    parts = relationship("Part", back_populates="part_type")
    
    __table_args__ = (
        Index('ix_part_type_name', 'name'),
    )
