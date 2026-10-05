from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class CostEstimationBase(BaseModel):
    estimation_number: str = Field(..., min_length=1, max_length=50)
    estimation_date: datetime
    customer_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)
    quantity: Decimal = Field(..., gt=0)


class CostEstimationCreate(CostEstimationBase):
    pass


class CostEstimationUpdate(BaseModel):
    estimation_number: Optional[str] = Field(None, min_length=1, max_length=50)
    estimation_date: Optional[datetime] = None
    customer_id: Optional[int] = Field(None, gt=0)
    product_id: Optional[int] = Field(None, gt=0)
    quantity: Optional[Decimal] = Field(None, gt=0)


class CostEstimationResponse(CostEstimationBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
