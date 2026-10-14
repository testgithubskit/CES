from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class CustomColumnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    field_key: str
    field_type: str
    max_length: int
    sort_order: int


class RecordList(BaseModel, Generic[T]):
    items: list[T]
    custom_columns: list[CustomColumnResponse]
