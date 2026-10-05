from sqlalchemy import String, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class Assembly(Base, TimestampMixin):
    __tablename__ = "assembly"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    parent_assembly_id: Mapped[int] = mapped_column(Integer, ForeignKey("assembly.id"), nullable=True)
    assembly_number: Mapped[str] = mapped_column(String(50), nullable=False)
    assembly_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    product = relationship("Product", back_populates="assemblies", foreign_keys=[product_id])
    parent_assembly = relationship("Assembly", remote_side=[id], back_populates="child_assemblies")
    child_assemblies = relationship("Assembly", back_populates="parent_assembly", foreign_keys=[parent_assembly_id])
    parts = relationship("Part", back_populates="assembly")
    documents = relationship("Document", back_populates="assembly", foreign_keys="Document.assembly_id")
    created_by_user = relationship("User", back_populates="assemblies_created", foreign_keys=[created_by])
    
    __table_args__ = (
        Index('ix_assembly_product_id', 'product_id'),
        Index('ix_assembly_parent_assembly_id', 'parent_assembly_id'),
        Index('ix_assembly_assembly_number', 'assembly_number'),
    )
