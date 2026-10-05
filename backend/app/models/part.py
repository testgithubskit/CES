from sqlalchemy import String, Text, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class Part(Base, TimestampMixin):
    __tablename__ = "part"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    assembly_id: Mapped[int] = mapped_column(Integer, ForeignKey("assembly.id"), nullable=True)
    part_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("part_type.id"), nullable=False)
    part_number: Mapped[str] = mapped_column(String(50), nullable=False)
    part_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    size: Mapped[str] = mapped_column(String(100), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    product = relationship("Product", back_populates="parts", foreign_keys=[product_id])
    assembly = relationship("Assembly", back_populates="parts", foreign_keys=[assembly_id])
    part_type = relationship("PartType", back_populates="parts")
    documents = relationship("Document", back_populates="part", foreign_keys="Document.part_id")
    operations = relationship("Operation", back_populates="part")
    estimation_operation_costs = relationship("EstimationOperationCost", back_populates="part")
    created_by_user = relationship("User", back_populates="parts_created", foreign_keys=[created_by])
    
    __table_args__ = (
        Index('ix_part_product_id', 'product_id'),
        Index('ix_part_assembly_id', 'assembly_id'),
        Index('ix_part_part_type_id', 'part_type_id'),
        Index('ix_part_part_number', 'part_number'),
    )
