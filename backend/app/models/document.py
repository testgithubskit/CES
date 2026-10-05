from sqlalchemy import String, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class Document(Base, TimestampMixin):
    __tablename__ = "document"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("part.id"), nullable=True)
    assembly_id: Mapped[int] = mapped_column(Integer, ForeignKey("assembly.id"), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=True)
    version: Mapped[str] = mapped_column(String(50), nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    part = relationship("Part", back_populates="documents", foreign_keys=[part_id])
    assembly = relationship("Assembly", back_populates="documents", foreign_keys=[assembly_id])
    uploaded_by_user = relationship("User", back_populates="documents_uploaded", foreign_keys=[uploaded_by])
    
    __table_args__ = (
        Index('ix_document_part_id', 'part_id'),
        Index('ix_document_assembly_id', 'assembly_id'),
        Index('ix_document_file_name', 'file_name'),
    )
