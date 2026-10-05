from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class AssemblyBase(BaseModel):
    product_id: int = Field(..., gt=0)
    parent_assembly_id: Optional[int] = Field(None, gt=0)
    assembly_number: str = Field(..., min_length=1, max_length=50)
    assembly_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class AssemblyCreate(AssemblyBase):
    pass


class AssemblyUpdate(BaseModel):
    product_id: Optional[int] = Field(None, gt=0)
    parent_assembly_id: Optional[int] = Field(None, gt=0)
    assembly_number: Optional[str] = Field(None, min_length=1, max_length=50)
    assembly_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class AssemblyResponse(AssemblyBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
