from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.part import Part
from app.schemas.part import PartCreate, PartUpdate, PartResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/parts", tags=["Parts"])


@router.post("/", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(
    part_data: PartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new part. Admin only.
    """
    # Check if product exists
    from app.models.product import Product
    product = db.query(Product).filter(Product.id == part_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with id {part_data.product_id} not found"
        )
    
    # If assembly_id is provided, validate it
    if part_data.assembly_id:
        from app.models.assembly import Assembly
        assembly = db.query(Assembly).filter(
            Assembly.id == part_data.assembly_id
        ).first()
        if not assembly:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Assembly with id {part_data.assembly_id} not found"
            )
        
        # Validate assembly belongs to same product
        if assembly.product_id != part_data.product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assembly must belong to the same product"
            )
    
    # Check if part type exists
    from app.models.part_type import PartType
    part_type = db.query(PartType).filter(PartType.id == part_data.part_type_id).first()
    if not part_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Part type with id {part_data.part_type_id} not found"
        )
    
    db_part = Part(
        **part_data.model_dump(),
        created_by=current_user.id
    )
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


@router.get("/", response_model=List[PartResponse])
def get_parts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all parts. Both admin and user can access.
    """
    parts = db.query(Part).order_by(Part.id.asc()).all()
    return parts


@router.get("/{part_id}", response_model=PartResponse)
def get_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific part by ID.
    """
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    return part


@router.get("/product/{product_id}", response_model=List[PartResponse])
def get_parts_by_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all parts for a specific product.
    """
    parts = db.query(Part).filter(
        Part.product_id == product_id
    ).order_by(Part.id.asc()).all()
    return parts


@router.get("/assembly/{assembly_id}", response_model=List[PartResponse])
def get_parts_by_assembly(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all parts for a specific assembly.
    """
    parts = db.query(Part).filter(
        Part.assembly_id == assembly_id
    ).order_by(Part.id.asc()).all()
    return parts


@router.put("/{part_id}", response_model=PartResponse)
def update_part(
    part_id: int,
    part_update: PartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a part. Admin only.
    """
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    update_data = part_update.model_dump(exclude_unset=True)
    
    # Validate assembly_id if being updated
    if 'assembly_id' in update_data:
        new_assembly_id = update_data['assembly_id']
        
        if new_assembly_id:
            from app.models.assembly import Assembly
            assembly = db.query(Assembly).filter(
                Assembly.id == new_assembly_id
            ).first()
            if not assembly:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Assembly with id {new_assembly_id} not found"
                )
            
            # Validate assembly belongs to same product
            if assembly.product_id != part.product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assembly must belong to the same product"
                )
    
    for field, value in update_data.items():
        setattr(part, field, value)
    
    db.commit()
    db.refresh(part)
    return part


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a part. Admin only.
    """
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    # Check if part has operations
    from app.models.operation import Operation
    existing_operations = db.query(Operation).filter(
        Operation.part_id == part_id
    ).first()
    if existing_operations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete part with operations. Delete operations first."
        )
    
    db.delete(part)
    db.commit()
    return None
