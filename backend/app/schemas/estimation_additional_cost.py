from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class EstimationAdditionalCostBase(BaseModel):
    estimation_id: int = Field(..., gt=0)
    cost_name: str = Field(..., min_length=1, max_length=255)
    cost_value: Decimal = Field(..., ge=0)


class EstimationAdditionalCostCreate(EstimationAdditionalCostBase):
    pass


class EstimationAdditionalCostUpdate(BaseModel):
    cost_name: Optional[str] = Field(None, min_length=1, max_length=255)
    cost_value: Optional[Decimal] = Field(None, ge=0)


class EstimationAdditionalCostResponse(EstimationAdditionalCostBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
