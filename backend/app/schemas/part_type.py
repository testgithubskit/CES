from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class PartTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class PartTypeCreate(PartTypeBase):
    pass


class PartTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class PartTypeResponse(PartTypeBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
