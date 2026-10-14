from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, Dict


class CustomerBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    branch: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = Field(None, max_length=50)


class CustomerCreate(CustomerBase):
    custom_fields: Dict[str, Optional[str]] | None = None


class CustomerUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    branch: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = Field(None, max_length=50)
    custom_fields: Dict[str, Optional[str]] | None = None


class CustomerResponse(CustomerBase):
    id: int
    custom_fields: Dict[str, str] = {}
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
