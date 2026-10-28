from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from app.schemas.product import as_whole_number


class PartBase(BaseModel):
    product_id: int = Field(..., gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    part_number: str = Field(..., min_length=1, max_length=50)
    part_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    size: Optional[str] = Field(None, max_length=100)
    quantity: int = Field(..., gt=0)

    @field_validator("quantity", mode="before")
    @classmethod
    def quantity_is_integer(cls, value):
        return as_whole_number(value)


class PartCreate(PartBase):
    pass


class PartBulkItem(BaseModel):
    part_number: str = Field(..., min_length=1, max_length=50)
    part_name: str = Field(..., min_length=1, max_length=255)
    size: Optional[str] = Field(None, max_length=100)
    quantity: int = Field(..., gt=0)

    @field_validator("quantity", mode="before")
    @classmethod
    def quantity_is_integer(cls, value):
        return as_whole_number(value)


class PartBulkCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    parts: list[PartBulkItem] = Field(..., min_length=1)


class PartUpdate(BaseModel):
    product_id: Optional[int] = Field(None, gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    part_number: Optional[str] = Field(None, min_length=1, max_length=50)
    part_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    size: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = Field(None, gt=0)

    @field_validator("quantity", mode="before")
    @classmethod
    def quantity_is_integer(cls, value):
        return as_whole_number(value)


class PartResponse(PartBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
