from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class PartBase(BaseModel):
    product_id: int = Field(..., gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    part_type_id: int = Field(..., gt=0)
    part_number: str = Field(..., min_length=1, max_length=50)
    part_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    size: Optional[str] = Field(None, max_length=100)
    quantity: Decimal = Field(..., gt=0)


class PartCreate(PartBase):
    pass


class PartUpdate(BaseModel):
    product_id: Optional[int] = Field(None, gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    part_type_id: Optional[int] = Field(None, gt=0)
    part_number: Optional[str] = Field(None, min_length=1, max_length=50)
    part_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    size: Optional[str] = Field(None, max_length=100)
    quantity: Optional[Decimal] = Field(None, gt=0)


class PartResponse(PartBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
