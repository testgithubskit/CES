from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.database.session import get_db
from app.models.product import Product
from app.models.assembly import Assembly
from app.models.part import Part
from app.models.operation import Operation
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User
from app.schemas.listing import RecordList
from app.services.custom_fields import apply_values, catalog, entries_for_entity, pop_custom, with_fields, with_fields_many

router = APIRouter(prefix="/api/v1/products", tags=["Products"])


# Hierarchy response schemas
class OperationHierarchy(BaseModel):
    id: int
    operation_number: str
    operation_name: str
    operation_type: str
    work_center_id: int
    work_center_name: Optional[str] = None
    machine_id: int
    machine_name: Optional[str] = None
    machine_mhr: Optional[float] = None
    setup_time: str
    cycle_time: str
    work_instructions: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentHierarchy(BaseModel):
    id: int
    part_id: Optional[int] = None
    file_name: str
    file_type: str
    document_type: Optional[str] = None
    version: Optional[str] = None


class PartHierarchy(BaseModel):
    id: int
    part_number: str
    part_name: str
    description: Optional[str] = None
    size: Optional[str] = None
    quantity: int
    part_type_id: int
    part_type_name: Optional[str] = None
    assembly_id: Optional[int] = None
    operations: List[OperationHierarchy] = []
    documents: List[DocumentHierarchy] = []
    
    class Config:
        from_attributes = True


class AssemblyHierarchy(BaseModel):
    id: int
    assembly_number: str
    assembly_name: str
    parent_assembly_id: Optional[int] = None
    parts: List[PartHierarchy] = []
    sub_assemblies: List['AssemblyHierarchy'] = []
    
    class Config:
        from_attributes = True


AssemblyHierarchy.model_rebuild()


class CustomFieldEntry(BaseModel):
    key: str
    label: str
    value: str = ""


class ProductHierarchy(BaseModel):
    id: int
    product_number: str
    product_name: str
    quantity: int
    version: Optional[str] = None
    description: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    custom_fields: List[CustomFieldEntry] = []
    direct_parts: List[PartHierarchy] = []
    assemblies: List[AssemblyHierarchy] = []


def _product_response(db: Session, product: Product) -> ProductResponse:
    return with_fields(db, "product", product, ProductResponse)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new product. Admin only. Version defaults to 1.
    """
    payload = product_data.model_dump()
    custom_fields = pop_custom(payload)
    if not payload.get("version"):
        payload["version"] = "1"
    db_product = Product(
        **payload,
        created_by=current_user.id
    )
    db.add(db_product)
    db.flush()
    apply_values(db, "product", db_product.id, custom_fields)
    db.commit()
    db.refresh(db_product)
    return _product_response(db, db_product)


@router.get("/", response_model=RecordList[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all products, including custom column definitions. Both admin and user can access.
    """
    products = db.query(Product).options(joinedload(Product.created_by_user)).order_by(Product.id.asc()).all()
    return catalog(db, "product", products, ProductResponse)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific product by ID.
    """
    product = db.query(Product).options(joinedload(Product.created_by_user)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return _product_response(db, product)


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
    product = db.query(Product).options(joinedload(Product.created_by_user)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    custom_fields = pop_custom(update_data)
    for field, value in update_data.items():
        setattr(product, field, value)
    apply_values(db, "product", product.id, custom_fields)
    db.commit()
    db.refresh(product)
    return _product_response(db, product)


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
    
    from app.services.bom_delete import delete_assembly_tree, delete_part_tree

    direct_parts = db.query(Part).filter(
        Part.product_id == product_id,
        Part.assembly_id.is_(None),
    ).all()
    for part in direct_parts:
        delete_part_tree(db, part)

    root_assemblies = db.query(Assembly).filter(
        Assembly.product_id == product_id,
        Assembly.parent_assembly_id.is_(None),
    ).all()
    for assembly in root_assemblies:
        delete_assembly_tree(db, assembly)
    
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
    product = db.query(Product).options(joinedload(Product.created_by_user)).filter(Product.id == product_id).first()
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
        selectinload(Part.part_type),
        selectinload(Part.documents),
        selectinload(Part.operations).selectinload(Operation.work_center),
        selectinload(Part.operations).selectinload(Operation.machine),
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
    
    def build_part_hierarchy(part) -> PartHierarchy:
        operation_hierarchies = []
        for op in part.operations:
            operation_hierarchies.append(OperationHierarchy(
                id=op.id,
                operation_number=op.operation_number,
                operation_name=op.operation_name,
                work_center_id=op.work_center_id,
                work_center_name=op.work_center.name if op.work_center else None,
                machine_id=op.machine_id,
                machine_name=op.machine.name if op.machine else None,
                machine_mhr=float(op.machine.mhr) if op.machine and op.machine.mhr else None,
                operation_type=op.operation_type,
                setup_time=op.setup_time,
                cycle_time=op.cycle_time,
                work_instructions=op.work_instructions,
                notes=op.notes,
            ))
        return PartHierarchy(
            id=part.id,
            part_number=part.part_number,
            part_name=part.part_name,
            description=part.description,
            size=part.size,
            quantity=int(part.quantity),
            part_type_id=part.part_type_id,
            part_type_name=part.part_type.name if part.part_type else None,
            assembly_id=part.assembly_id,
            operations=operation_hierarchies,
            documents=[
                DocumentHierarchy(
                    id=document.id,
                    part_id=document.part_id,
                    file_name=document.file_name,
                    file_type=document.file_type,
                    document_type=document.document_type,
                    version=document.version,
                )
                for document in part.documents
            ],
        )

    def build_assembly_hierarchy(assembly_id: int) -> AssemblyHierarchy:
        assembly = assembly_map[assembly_id]
        part_hierarchies = [build_part_hierarchy(part) for part in parts_by_assembly.get(assembly_id, [])]
        
        # Get sub-assemblies
        sub_assemblies = assemblies_by_parent.get(assembly_id, [])
        sub_assembly_hierarchies = []
        for sub_asm in sub_assemblies:
            sub_assembly_hierarchies.append(build_assembly_hierarchy(sub_asm.id))
        
        return AssemblyHierarchy(
            id=assembly.id,
            assembly_number=assembly.assembly_number,
            assembly_name=assembly.assembly_name,
            parent_assembly_id=assembly.parent_assembly_id,
            parts=part_hierarchies,
            sub_assemblies=sub_assembly_hierarchies
        )
    
    # Build root assemblies
    root_assembly_hierarchies = []
    for root_asm in assemblies_by_parent.get(None, []):
        root_assembly_hierarchies.append(build_assembly_hierarchy(root_asm.id))
    
    # Build direct parts (not under any assembly)
    direct_part_hierarchies = [build_part_hierarchy(part) for part in parts_by_assembly.get(None, [])]
    
    return ProductHierarchy(
        id=product.id,
        product_number=product.product_number,
        product_name=product.product_name,
        quantity=int(product.quantity),
        version=product.version,
        description=product.description,
        created_by=product.created_by,
        created_by_name=product.created_by_name,
        custom_fields=entries_for_entity(db, "product", product.id),
        direct_parts=direct_part_hierarchies,
        assemblies=root_assembly_hierarchies
    )
