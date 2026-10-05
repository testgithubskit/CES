from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional


class CustomerBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    branch: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = Field(None, max_length=50)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    branch: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = Field(None, max_length=50)


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
