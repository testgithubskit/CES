from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class DocumentBase(BaseModel):
    part_id: Optional[int] = Field(None, gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., min_length=1, max_length=50)
    document_type: Optional[str] = Field(None, max_length=50)
    version: Optional[str] = Field(None, max_length=50)
    file_path: str = Field(..., min_length=1, max_length=500)


class DocumentCreate(BaseModel):
    part_id: Optional[int] = Field(None, gt=0)
    assembly_id: Optional[int] = Field(None, gt=0)
    document_type: Optional[str] = Field(None, max_length=50)
    version: Optional[str] = Field(None, max_length=50)


class DocumentUpdate(BaseModel):
    document_type: Optional[str] = Field(None, max_length=50)
    version: Optional[str] = Field(None, max_length=50)


class DocumentResponse(DocumentBase):
    id: int
    uploaded_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
