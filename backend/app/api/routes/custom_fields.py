from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.database.session import get_db
from app.models.user import User
from app.services.custom_fields import create_definition, definitions, delete_definition, require_entity, update_definition

router = APIRouter(prefix="/api/v1/custom-fields", tags=["Custom Fields"])


class CustomFieldBody(BaseModel):
    label: str = Field(..., min_length=1, max_length=40)
    field_type: str = "text"
    max_length: int = Field(default=40, ge=1, le=120)
    is_required: bool = False


class CustomFieldResponse(BaseModel):
    id: int
    entity_type: str
    label: str
    field_key: str
    field_type: str
    max_length: int
    is_required: bool
    sort_order: int

    class Config:
        from_attributes = True


@router.get("/{entity_type}", response_model=list[CustomFieldResponse])
def get_custom_fields(
    entity_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_entity(entity_type)
    return definitions(db, entity_type)


@router.post("/{entity_type}", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
def add_custom_field(
    entity_type: str,
    body: CustomFieldBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return create_definition(db, entity_type, body.label, body.field_type, body.max_length, body.is_required)


@router.put("/{entity_type}/{field_id}", response_model=CustomFieldResponse)
def edit_custom_field(
    entity_type: str,
    field_id: int,
    body: CustomFieldBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return update_definition(db, entity_type, field_id, body.label, body.field_type, body.max_length, body.is_required)


@router.delete("/{entity_type}/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_custom_field(
    entity_type: str,
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    delete_definition(db, entity_type, field_id)
    return None
