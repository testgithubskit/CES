import io
import zipfile
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.part import Part
from app.schemas.part import PartBulkCreate, PartCreate, PartUpdate, PartResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/parts", tags=["Parts"])

WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
TYPE_NAMES = {
    "in-house": "In-house",
    "inhouse": "In-house",
    "in house": "In-house",
    "out-source": "Out-source",
    "outsource": "Out-source",
    "out source": "Out-source",
    "standard": "Standard",
}


def _cell_text(cell) -> str:
    return "".join(node.text or "" for node in cell.findall(".//w:t", WORD_NS)).strip()


def parse_parts_docx(content: bytes) -> list[dict]:
    with zipfile.ZipFile(io.BytesIO(content)) as package:
        root = ET.fromstring(package.read("word/document.xml"))
    extracted = []
    for table in root.findall(".//w:tbl", WORD_NS):
        grid = []
        for row in table.findall("./w:tr", WORD_NS):
            grid.append([_cell_text(cell) for cell in row.findall("./w:tc", WORD_NS)])
        if len(grid) < 2:
            continue
        header = [cell.lower() for cell in grid[0]]

        def column(*needles):
            for index, label in enumerate(header):
                if any(needle in label for needle in needles):
                    return index
            return None

        name_index = column("name of part", "part name")
        number_index = column("part no", "part number")
        size_index = column("size")
        quantity_index = column("quantity", "qty", "no. of parts")
        type_index = column("part type", "type")
        if name_index is None or number_index is None:
            continue

        def value(cells, index):
            if index is None or index >= len(cells):
                return ""
            return cells[index].strip()

        for cells in grid[1:]:
            name = value(cells, name_index)
            number = value(cells, number_index)
            if not name and not number:
                continue
            extracted.append({
                "part_name": name,
                "part_number": number,
                "size": value(cells, size_index),
                "quantity": value(cells, quantity_index) or "1",
                "part_type": value(cells, type_index) or "Standard",
            })
    return extracted


def _part_type(db: Session, label: str, user_id: int):
    from app.models.part_type import PartType

    key = " ".join(label.strip().lower().replace("_", " ").split())
    canonical = TYPE_NAMES.get(key, label.strip())
    existing = db.query(PartType).filter(PartType.name.ilike(canonical)).first()
    if existing:
        return existing
    created = PartType(name=canonical, created_by=user_id)
    db.add(created)
    db.flush()
    return created


@router.post("/parse-template")
def parse_template(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    name = (file.filename or "").lower()
    if not name.endswith(".docx"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a .docx file made from the parts template")
    rows = parse_parts_docx(file.file.read())
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No parts were found in the document")
    return {"rows": rows, "count": len(rows)}


@router.post("/bulk", response_model=List[PartResponse], status_code=status.HTTP_201_CREATED)
def create_parts_bulk(
    body: PartBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.product import Product
    from app.models.assembly import Assembly

    product = db.query(Product).filter(Product.id == body.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product not found")
    if body.assembly_id:
        assembly = db.query(Assembly).filter(Assembly.id == body.assembly_id).first()
        if not assembly or assembly.product_id != body.product_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assembly must belong to this product")
    created = []
    for item in body.parts:
        part_type = _part_type(db, item.part_type, current_user.id)
        part = Part(
            product_id=body.product_id,
            assembly_id=body.assembly_id,
            part_type_id=part_type.id,
            part_number=item.part_number.strip(),
            part_name=item.part_name.strip(),
            size=item.size.strip() if item.size else None,
            quantity=item.quantity,
            created_by=current_user.id,
        )
        db.add(part)
        created.append(part)
    db.commit()
    for part in created:
        db.refresh(part)
    return created


@router.post("/", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(
    part_data: PartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    
    from app.services.bom_delete import delete_part_tree
    delete_part_tree(db, part)
    db.commit()
    return None
