from sqlalchemy import String, Boolean, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "user"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Relationships
    # created_by references
    mhr_particulars_created = relationship("MHRParticular", back_populates="created_by_user", foreign_keys="MHRParticular.created_by")
    part_types_created = relationship("PartType", back_populates="created_by_user", foreign_keys="PartType.created_by")
    products_created = relationship("Product", back_populates="created_by_user", foreign_keys="Product.created_by")
    assemblies_created = relationship("Assembly", back_populates="created_by_user", foreign_keys="Assembly.created_by")
    parts_created = relationship("Part", back_populates="created_by_user", foreign_keys="Part.created_by")
    operations_created = relationship("Operation", back_populates="created_by_user", foreign_keys="Operation.created_by")
    cost_estimations_created = relationship("CostEstimation", back_populates="created_by_user", foreign_keys="CostEstimation.created_by")
    
    # uploaded_by references
    documents_uploaded = relationship("Document", back_populates="uploaded_by_user", foreign_keys="Document.uploaded_by")
    
    # updated_by references
    machine_mhr_values_updated = relationship("MachineMHRValue", back_populates="updated_by_user", foreign_keys="MachineMHRValue.updated_by")
    
    # mhr_updated_by references
    machines_mhr_updated = relationship("Machine", back_populates="mhr_updated_by_user", foreign_keys="Machine.mhr_updated_by")
    
    # user_id references
    estimation_additional_costs = relationship("EstimationAdditionalCost", back_populates="user")
    
    __table_args__ = (
        Index('ix_user_email', 'email'),
        Index('ix_user_is_active', 'is_active'),
    )
