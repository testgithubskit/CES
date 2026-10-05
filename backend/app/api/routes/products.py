from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.database.session import get_db
from app.models.product import Product
from app.models.assembly import Assembly
from app.models.part import Part
from app.models.operation import Operation
from app.models.machine import Machine
from app.models.work_center import WorkCenter
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/products", tags=["Products"])


# Hierarchy response schemas
class OperationHierarchy(BaseModel):
    id: int
    operation_number: str
    operation_name: str
    work_center_id: int
    work_center_name: Optional[str] = None
    machine_id: int
    machine_name: Optional[str] = None
    machine_mhr: Optional[float] = None
    setup_time: float
    cycle_time: float
    work_instructions: Optional[str] = None
    notes: Optional[str] = None
    sequence_no: Optional[int] = None
    
    class Config:
        from_attributes = True


class PartHierarchy(BaseModel):
    id: int
    part_number: str
    part_name: str
    description: Optional[str] = None
    size: Optional[str] = None
    quantity: float
    part_type_id: int
    assembly_id: Optional[int] = None
    operations: List[OperationHierarchy] = []
    
    class Config:
        from_attributes = True


class AssemblyHierarchy(BaseModel):
    id: int
    assembly_number: str
    assembly_name: str
    description: Optional[str] = None
    parent_assembly_id: Optional[int] = None
    parts: List[PartHierarchy] = []
    sub_assemblies: List['AssemblyHierarchy'] = []
    
    class Config:
        from_attributes = True


AssemblyHierarchy.model_rebuild()


class ProductHierarchy(BaseModel):
    id: int
    product_number: str
    product_name: str
    version: Optional[str] = None
    description: Optional[str] = None
    direct_parts: List[PartHierarchy] = []
    assemblies: List[AssemblyHierarchy] = []


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new product. Admin only.
    """
    db_product = Product(
        **product_data.model_dump(),
        created_by=current_user.id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=List[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all products. Both admin and user can access.
    """
    products = db.query(Product).order_by(Product.id.asc()).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific product by ID.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a product. Admin only.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a product. Admin only.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if product has existing cost estimations
    from app.models.cost_estimation import CostEstimation
    existing_estimations = db.query(CostEstimation).filter(
        CostEstimation.product_id == product_id
    ).first()
    
    if existing_estimations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete product - it has existing cost estimations"
        )
    
    # Cascade delete assemblies and parts
    # Delete assemblies recursively
    def delete_assembly_recursive(assembly_id: int) -> None:
        child_assemblies = db.query(Assembly).filter(
            Assembly.parent_assembly_id == assembly_id
        ).all()
        
        for child_assembly in child_assemblies:
            delete_assembly_recursive(child_assembly.id)
        
        assembly_to_delete = db.query(Assembly).filter(
            Assembly.id == assembly_id
        ).first()
        if assembly_to_delete:
            db.delete(assembly_to_delete)
    
    # Delete parts for this product
    db.query(Part).filter(Part.product_id == product_id).delete(
        synchronize_session=False
    )
    
    # Delete assemblies
    root_assemblies = db.query(Assembly).filter(
        Assembly.product_id == product_id
    ).all()
    for assembly in root_assemblies:
        delete_assembly_recursive(assembly.id)
    
    db.delete(product)
    db.commit()
    return None


@router.get("/{product_id}/hierarchy", response_model=ProductHierarchy)
def get_product_hierarchy(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete product hierarchy with nested assemblies, parts, and operations.
    """
    # Get product
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get all assemblies for this product with eager loading
    all_assemblies = db.query(Assembly).filter(
        Assembly.product_id == product_id
    ).all()
    
    # Get all parts for this product with eager loading
    all_parts = db.query(Part).options(
        selectinload(Part.operations).selectinload(Operation.machine).selectinload(Machine.work_center)
    ).filter(Part.product_id == product_id).all()
    
    # Build hierarchy
    assembly_map = {asm.id: asm for asm in all_assemblies}
    parts_by_assembly: dict[int | None, list] = {}
    assemblies_by_parent: dict[int | None, list] = {}
    
    # Group parts by assembly_id
    for part in all_parts:
        parts_by_assembly.setdefault(part.assembly_id, []).append(part)
    
    # Group assemblies by parent_assembly_id
    for asm in all_assemblies:
        assemblies_by_parent.setdefault(asm.parent_assembly_id, []).append(asm)
    
    def build_assembly_hierarchy(assembly_id: int) -> AssemblyHierarchy:
        assembly = assembly_map[assembly_id]
        
        # Get parts directly under this assembly
        parts = parts_by_assembly.get(assembly_id, [])
        part_hierarchies = []
        for part in parts:
            # Build operation hierarchies
            operation_hierarchies = []
            for op in part.operations:
                op_hierarchy = OperationHierarchy(
                    id=op.id,
                    operation_number=op.operation_number,
                    operation_name=op.operation_name,
                    work_center_id=op.work_center_id,
                    work_center_name=op.work_center.name if op.work_center else None,
                    machine_id=op.machine_id,
                    machine_name=op.machine.name if op.machine else None,
                    machine_mhr=float(op.machine.mhr) if op.machine and op.machine.mhr else None,
                    setup_time=float(op.setup_time),
                    cycle_time=float(op.cycle_time),
                    work_instructions=op.work_instructions,
                    notes=op.notes,
                    sequence_no=op.sequence_no
                )
                operation_hierarchies.append(op_hierarchy)
            
            part_hierarchy = PartHierarchy(
                id=part.id,
                part_number=part.part_number,
                part_name=part.part_name,
                description=part.description,
                size=part.size,
                quantity=float(part.quantity),
                part_type_id=part.part_type_id,
                assembly_id=part.assembly_id,
                operations=operation_hierarchies
            )
            part_hierarchies.append(part_hierarchy)
        
        # Get sub-assemblies
        sub_assemblies = assemblies_by_parent.get(assembly_id, [])
        sub_assembly_hierarchies = []
        for sub_asm in sub_assemblies:
            sub_assembly_hierarchies.append(build_assembly_hierarchy(sub_asm.id))
        
        return AssemblyHierarchy(
            id=assembly.id,
            assembly_number=assembly.assembly_number,
            assembly_name=assembly.assembly_name,
            description=assembly.description,
            parent_assembly_id=assembly.parent_assembly_id,
            parts=part_hierarchies,
            sub_assemblies=sub_assembly_hierarchies
        )
    
    # Build root assemblies
    root_assembly_hierarchies = []
    for root_asm in assemblies_by_parent.get(None, []):
        root_assembly_hierarchies.append(build_assembly_hierarchy(root_asm.id))
    
    # Build direct parts (not under any assembly)
    direct_parts = parts_by_assembly.get(None, [])
    direct_part_hierarchies = []
    for part in direct_parts:
        operation_hierarchies = []
        for op in part.operations:
            op_hierarchy = OperationHierarchy(
                id=op.id,
                operation_number=op.operation_number,
                operation_name=op.operation_name,
                work_center_id=op.work_center_id,
                work_center_name=op.work_center.name if op.work_center else None,
                machine_id=op.machine_id,
                machine_name=op.machine.name if op.machine else None,
                machine_mhr=float(op.machine.mhr) if op.machine and op.machine.mhr else None,
                setup_time=float(op.setup_time),
                cycle_time=float(op.cycle_time),
                work_instructions=op.work_instructions,
                notes=op.notes,
                sequence_no=op.sequence_no
            )
            operation_hierarchies.append(op_hierarchy)
        
        part_hierarchy = PartHierarchy(
            id=part.id,
            part_number=part.part_number,
            part_name=part.part_name,
            description=part.description,
            size=part.size,
            quantity=float(part.quantity),
            part_type_id=part.part_type_id,
            assembly_id=part.assembly_id,
            operations=operation_hierarchies
        )
        direct_part_hierarchies.append(part_hierarchy)
    
    return ProductHierarchy(
        id=product.id,
        product_number=product.product_number,
        product_name=product.product_name,
        version=product.version,
        description=product.description,
        direct_parts=direct_part_hierarchies,
        assemblies=root_assembly_hierarchies
    )
