from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, Dict
import re


def _clean_name(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", (value or "").strip())
    if not cleaned:
        raise ValueError("Name is required")
    return cleaned


def _reject_password_spaces(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value
    if any(character.isspace() for character in value):
        raise ValueError("Password cannot contain spaces")
    return value


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    role: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _clean_name(value)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=6)
    role: str = Field(default="user", min_length=1, max_length=50)
    custom_fields: Dict[str, Optional[str]] | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _reject_password_spaces(value)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, min_length=1, max_length=50)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=6)
    custom_fields: Dict[str, Optional[str]] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _clean_name(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        return _reject_password_spaces(value)


class UserResponse(UserBase):
    id: int
    custom_fields: Dict[str, str] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
