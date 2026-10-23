from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ReportTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    is_default: bool = False
    template_data: dict[str, Any] = Field(default_factory=dict)


class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_default: Optional[bool] = None
    template_data: Optional[dict[str, Any]] = None


class ReportTemplateResponse(BaseModel):
    id: int
    name: str
    is_default: bool
    template_data: dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
