from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Dict


def as_whole_number(value):
    if value is None or value == "":
        return value
    number = float(value)
    if number <= 0 or number != int(number):
        raise ValueError("Quantity must be a whole number")
    return int(number)


class ProductBase(BaseModel):
    product_number: str = Field(..., min_length=1, max_length=50)
    product_name: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(..., gt=0)

    @field_validator("quantity", mode="before")
    @classmethod
    def quantity_is_integer(cls, value):
        return as_whole_number(value)
    version: str = Field(default="1", max_length=50)
    description: Optional[str] = None


class ProductCreate(ProductBase):
    product_number: str = Field(..., min_length=1, max_length=20)
    product_name: str = Field(..., min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=160)
    custom_fields: Dict[str, Optional[str]] = {}


class ProductUpdate(BaseModel):
    product_number: Optional[str] = Field(None, min_length=1, max_length=20)
    product_name: Optional[str] = Field(None, min_length=1, max_length=60)
    quantity: Optional[int] = Field(None, gt=0)

    @field_validator("quantity", mode="before")
    @classmethod
    def quantity_is_integer(cls, value):
        return as_whole_number(value)
    version: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=160)
    custom_fields: Optional[Dict[str, Optional[str]]] = None


class ProductResponse(ProductBase):
    id: int
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    custom_fields: Dict[str, str] = {}
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
