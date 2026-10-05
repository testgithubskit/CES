from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class EstimationOperationCostBase(BaseModel):
    estimation_id: int = Field(..., gt=0)
    operation_id: int = Field(..., gt=0)
    part_id: int = Field(..., gt=0)
    machine_id: int = Field(..., gt=0)
    setup_hours: Decimal = Field(..., ge=0)
    cycle_hours: Decimal = Field(..., ge=0)
    part_quantity: Decimal = Field(..., gt=0)
    total_hours: Decimal = Field(..., ge=0)
    mhr_rate_snapshot: Decimal = Field(..., ge=0)
    machining_cost: Decimal = Field(..., ge=0)


class EstimationOperationCostCreate(EstimationOperationCostBase):
    pass


class EstimationOperationCostResponse(EstimationOperationCostBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
