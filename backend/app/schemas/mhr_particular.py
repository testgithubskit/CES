from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MHRParticularBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    is_input: bool = True
    formula: Optional[str] = None
    default_sequence: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    is_active: bool = True


class MHRParticularCreate(MHRParticularBase):
    pass


class MHRParticularUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_input: Optional[bool] = None
    formula: Optional[str] = None
    default_sequence: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class MHRParticularResponse(MHRParticularBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
