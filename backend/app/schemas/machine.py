from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class MachineBase(BaseModel):
    work_center_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=255)
    machine_code: str = Field(..., min_length=1, max_length=50)
    type: Optional[str] = Field(None, max_length=100)
    make: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year_of_installation: Optional[int] = Field(None, ge=1900, le=2100)
    remarks: Optional[str] = None
    is_active: bool = True


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    work_center_id: Optional[int] = Field(None, gt=0)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    machine_code: Optional[str] = Field(None, min_length=1, max_length=50)
    type: Optional[str] = Field(None, max_length=100)
    make: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year_of_installation: Optional[int] = Field(None, ge=1900, le=2100)
    remarks: Optional[str] = None
    is_active: Optional[bool] = None


class MachineResponse(MachineBase):
    id: int
    mhr: Optional[Decimal] = None
    recommended_mhr: Optional[Decimal] = None
    mhr_calculated_at: Optional[datetime] = None
    mhr_updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
