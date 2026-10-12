from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
import re


SETUP_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}:\d{2}$")
CYCLE_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
OPERATION_TYPES = {"in_house", "out_source"}


def _check_setup_time(value: str) -> str:
    if not SETUP_TIME_PATTERN.match(value):
        raise ValueError("Setup time must be HH:MM:SS")
    hours, minutes, seconds = (int(part) for part in value.split(":"))
    if minutes > 59 or seconds > 59:
        raise ValueError("Setup time minutes and seconds must be 00-59")
    return value


def _check_cycle_time(value: str) -> str:
    if not CYCLE_TIME_PATTERN.match(value):
        raise ValueError("Cycle time must be HH:MM")
    hours, minutes = (int(part) for part in value.split(":"))
    if minutes > 59:
        raise ValueError("Cycle time minutes must be 00-59")
    return value


class OperationBase(BaseModel):
    part_id: int = Field(..., gt=0)
    operation_name: str = Field(..., min_length=1, max_length=255)
    operation_type: str = Field(default="in_house", max_length=50)
    work_center_id: int = Field(..., gt=0)
    machine_id: int = Field(..., gt=0)
    setup_time: str = Field(..., max_length=20)
    cycle_time: str = Field(..., max_length=20)
    work_instructions: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("operation_type")
    @classmethod
    def validate_operation_type(cls, value: str) -> str:
        if value not in OPERATION_TYPES:
            raise ValueError("Operation type must be in_house or out_source")
        return value

    @field_validator("setup_time")
    @classmethod
    def validate_setup_time(cls, value: str) -> str:
        return _check_setup_time(value)

    @field_validator("cycle_time")
    @classmethod
    def validate_cycle_time(cls, value: str) -> str:
        return _check_cycle_time(value)


class OperationCreate(OperationBase):
    pass


class OperationUpdate(BaseModel):
    part_id: Optional[int] = Field(None, gt=0)
    operation_name: Optional[str] = Field(None, min_length=1, max_length=255)
    operation_type: Optional[str] = Field(None, max_length=50)
    work_center_id: Optional[int] = Field(None, gt=0)
    machine_id: Optional[int] = Field(None, gt=0)
    setup_time: Optional[str] = Field(None, max_length=20)
    cycle_time: Optional[str] = Field(None, max_length=20)
    work_instructions: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("operation_type")
    @classmethod
    def validate_operation_type(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in OPERATION_TYPES:
            raise ValueError("Operation type must be in_house or out_source")
        return value

    @field_validator("setup_time")
    @classmethod
    def validate_setup_time(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _check_setup_time(value)

    @field_validator("cycle_time")
    @classmethod
    def validate_cycle_time(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _check_cycle_time(value)


class OperationResponse(OperationBase):
    id: int
    operation_number: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
