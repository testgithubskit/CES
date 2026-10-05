from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.part_type import PartType
from app.schemas.part_type import PartTypeCreate, PartTypeUpdate, PartTypeResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/part-types", tags=["Part Types"])


@router.post("/", response_model=PartTypeResponse, status_code=status.HTTP_201_CREATED)
def create_part_type(
    part_type_data: PartTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new part type. Admin only.
    """
    db_part_type = PartType(
        name=part_type_data.name,
        created_by=current_user.id
    )
    db.add(db_part_type)
    db.commit()
    db.refresh(db_part_type)
    return db_part_type


@router.get("/", response_model=List[PartTypeResponse])
def get_part_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all part types. Both admin and user can access.
    """
    part_types = db.query(PartType).order_by(PartType.id.asc()).all()
    return part_types


@router.get("/{part_type_id}", response_model=PartTypeResponse)
def get_part_type(
    part_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific part type by ID.
    """
    part_type = db.query(PartType).filter(PartType.id == part_type_id).first()
    if not part_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part type not found"
        )
    return part_type


@router.put("/{part_type_id}", response_model=PartTypeResponse)
def update_part_type(
    part_type_id: int,
    part_type_update: PartTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a part type. Admin only.
    """
    part_type = db.query(PartType).filter(PartType.id == part_type_id).first()
    if not part_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part type not found"
        )
    
    update_data = part_type_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(part_type, field, value)
    
    db.commit()
    db.refresh(part_type)
    return part_type


@router.delete("/{part_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part_type(
    part_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a part type. Admin only.
    """
    part_type = db.query(PartType).filter(PartType.id == part_type_id).first()
    if not part_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part type not found"
        )
    
    # Check if part type has existing parts
    from app.models.part import Part
    existing_parts = db.query(Part).filter(
        Part.part_type_id == part_type_id
    ).first()
    
    if existing_parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete part type - it has existing parts"
        )
    
    db.delete(part_type)
    db.commit()
    return None
