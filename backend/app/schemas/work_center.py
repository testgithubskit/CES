from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict


class WorkCenterBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True


class WorkCenterCreate(WorkCenterBase):
    custom_fields: Dict[str, Optional[str]] | None = None


class WorkCenterUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    custom_fields: Dict[str, Optional[str]] | None = None


class WorkCenterResponse(WorkCenterBase):
    id: int
    custom_fields: Dict[str, str] = {}
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
