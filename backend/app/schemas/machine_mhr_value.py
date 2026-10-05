from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class MachineMHRValueBase(BaseModel):
    machine_id: int = Field(..., gt=0)
    particular_id: int = Field(..., gt=0)
    is_applicable: bool = True
    input_value: Optional[Decimal] = Field(None, ge=0)
    computed_value: Optional[Decimal] = Field(None, ge=0)


class MachineMHRValueCreate(MachineMHRValueBase):
    pass


class MachineMHRValueUpdate(BaseModel):
    is_applicable: Optional[bool] = None
    input_value: Optional[Decimal] = Field(None, ge=0)
    computed_value: Optional[Decimal] = Field(None, ge=0)


class MachineMHRValueResponse(MachineMHRValueBase):
    id: int
    updated_by: Optional[int] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True
