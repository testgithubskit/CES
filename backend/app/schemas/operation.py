from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class OperationBase(BaseModel):
    part_id: int = Field(..., gt=0)
    operation_number: str = Field(..., min_length=1, max_length=50)
    operation_name: str = Field(..., min_length=1, max_length=255)
    work_center_id: int = Field(..., gt=0)
    machine_id: int = Field(..., gt=0)
    setup_time: Decimal = Field(..., ge=0)
    cycle_time: Decimal = Field(..., ge=0)
    work_instructions: Optional[str] = None
    notes: Optional[str] = None
    sequence_no: Optional[int] = Field(None, ge=0)


class OperationCreate(OperationBase):
    pass


class OperationUpdate(BaseModel):
    part_id: Optional[int] = Field(None, gt=0)
    operation_number: Optional[str] = Field(None, min_length=1, max_length=50)
    operation_name: Optional[str] = Field(None, min_length=1, max_length=255)
    work_center_id: Optional[int] = Field(None, gt=0)
    machine_id: Optional[int] = Field(None, gt=0)
    setup_time: Optional[Decimal] = Field(None, ge=0)
    cycle_time: Optional[Decimal] = Field(None, ge=0)
    work_instructions: Optional[str] = None
    notes: Optional[str] = None
    sequence_no: Optional[int] = Field(None, ge=0)


class OperationResponse(OperationBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
