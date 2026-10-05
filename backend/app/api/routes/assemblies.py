from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.assembly import Assembly
from app.schemas.assembly import AssemblyCreate, AssemblyUpdate, AssemblyResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/assemblies", tags=["Assemblies"])


def _check_circular_assembly(assembly_id: int, parent_assembly_id: int, db: Session) -> bool:
    """
    Check if setting parent_assembly_id would create a circular reference.
    """
    if parent_assembly_id is None:
        return False
    
    if assembly_id == parent_assembly_id:
        return True
    
    # Check if parent_assembly_id is a descendant of assembly_id
    current_id = parent_assembly_id
    visited = set()
    
    while current_id is not None:
        if current_id == assembly_id:
            return True
        if current_id in visited:
            break
        visited.add(current_id)
        
        assembly = db.query(Assembly).filter(Assembly.id == current_id).first()
        if not assembly:
            break
        current_id = assembly.parent_assembly_id
    
    return False


@router.post("/", response_model=AssemblyResponse, status_code=status.HTTP_201_CREATED)
def create_assembly(
    assembly_data: AssemblyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new assembly. Admin only.
    """
    # Check if product exists
    from app.models.product import Product
    product = db.query(Product).filter(Product.id == assembly_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with id {assembly_data.product_id} not found"
        )
    
    # If parent_assembly_id is provided, validate it
    if assembly_data.parent_assembly_id:
        parent_assembly = db.query(Assembly).filter(
            Assembly.id == assembly_data.parent_assembly_id
        ).first()
        if not parent_assembly:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent assembly with id {assembly_data.parent_assembly_id} not found"
            )
        
        # Validate parent assembly belongs to same product
        if parent_assembly.product_id != assembly_data.product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent assembly must belong to the same product"
            )
    
    db_assembly = Assembly(
        **assembly_data.model_dump(),
        created_by=current_user.id
    )
    db.add(db_assembly)
    db.commit()
    db.refresh(db_assembly)
    return db_assembly


@router.get("/", response_model=List[AssemblyResponse])
def get_assemblies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all assemblies. Both admin and user can access.
    """
    assemblies = db.query(Assembly).order_by(Assembly.id.asc()).all()
    return assemblies


@router.get("/{assembly_id}", response_model=AssemblyResponse)
def get_assembly(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific assembly by ID.
    """
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    return assembly


@router.get("/product/{product_id}", response_model=List[AssemblyResponse])
def get_assemblies_by_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all assemblies for a specific product.
    """
    assemblies = db.query(Assembly).filter(
        Assembly.product_id == product_id
    ).order_by(Assembly.id.asc()).all()
    return assemblies


@router.get("/parent/{parent_id}", response_model=List[AssemblyResponse])
def get_child_assemblies(
    parent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all child assemblies for a parent assembly.
    """
    assemblies = db.query(Assembly).filter(
        Assembly.parent_assembly_id == parent_id
    ).order_by(Assembly.id.asc()).all()
    return assemblies


@router.put("/{assembly_id}", response_model=AssemblyResponse)
def update_assembly(
    assembly_id: int,
    assembly_update: AssemblyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update an assembly. Admin only.
    """
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    update_data = assembly_update.model_dump(exclude_unset=True)
    
    # Validate parent_assembly_id if being updated
    if 'parent_assembly_id' in update_data:
        new_parent_id = update_data['parent_assembly_id']
        
        if new_parent_id == assembly_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assembly cannot be its own parent"
            )
        
        if new_parent_id:
            parent_assembly = db.query(Assembly).filter(
                Assembly.id == new_parent_id
            ).first()
            if not parent_assembly:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Parent assembly with id {new_parent_id} not found"
                )
            
            # Validate parent assembly belongs to same product
            if parent_assembly.product_id != assembly.product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent assembly must belong to the same product"
                )
            
            # Check for circular reference
            if _check_circular_assembly(assembly_id, new_parent_id, db):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot create circular assembly reference"
                )
    
    for field, value in update_data.items():
        setattr(assembly, field, value)
    
    db.commit()
    db.refresh(assembly)
    return assembly


@router.delete("/{assembly_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assembly(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete an assembly. Admin only.
    """
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    # Check if assembly has child assemblies
    child_assemblies = db.query(Assembly).filter(
        Assembly.parent_assembly_id == assembly_id
    ).first()
    if child_assemblies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete assembly with child assemblies. Delete children first."
        )
    
    # Check if assembly has parts
    from app.models.part import Part
    existing_parts = db.query(Part).filter(
        Part.assembly_id == assembly_id
    ).first()
    if existing_parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete assembly with parts. Delete parts first."
        )
    
    db.delete(assembly)
    db.commit()
    return None
