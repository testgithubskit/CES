from sqlalchemy import Boolean, String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, TimestampMixin


class CustomField(Base, TimestampMixin):
    __tablename__ = "custom_field"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=True)
    field_key: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str] = mapped_column(String(40), nullable=False)
    field_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    max_length: Mapped[int] = mapped_column(Integer, nullable=False, default=40)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    value: Mapped[str] = mapped_column(Text, nullable=True)
