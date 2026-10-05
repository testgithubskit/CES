from sqlalchemy import String, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "product"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_number: Mapped[str] = mapped_column(String(50), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Relationships
    created_by_user = relationship("User", back_populates="products_created", foreign_keys=[created_by])
    assemblies = relationship("Assembly", back_populates="product", foreign_keys="Assembly.product_id")
    parts = relationship("Part", back_populates="product", foreign_keys="Part.product_id")
    cost_estimations = relationship("CostEstimation", back_populates="product")
    
    __table_args__ = (
        Index('ix_product_product_number', 'product_number'),
        Index('ix_product_product_name', 'product_name'),
    )
