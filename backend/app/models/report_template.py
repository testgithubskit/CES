from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, TimestampMixin


class ReportTemplate(Base, TimestampMixin):
    __tablename__ = "report_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    template_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=True)
