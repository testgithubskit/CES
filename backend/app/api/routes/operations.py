import io
import zipfile
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.operation import Operation
from app.schemas.operation import OperationBulkCreate, OperationCreate, OperationUpdate, OperationResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/operations", tags=["Operations"])

WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def _cell_text(cell) -> str:
    return "".join(node.text or "" for node in cell.findall(".//w:t", WORD_NS)).strip()


def _normalize_setup(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return "00:00:00"
    if len(value) == 5 and value.count(":") == 1:
        return f"{value}:00"
    return value


def _normalize_cycle(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return "00:00"
    return value[:5]


def parse_operations_docx(content: bytes) -> list[dict]:
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

        number_index = column("op number", "operation number", "op no")
        name_index = column("operation name", "operation")
        setup_index = column("setup")
        cycle_index = column("cycle")
        instructions_index = column("work instruction", "instruction")
        notes_index = column("note")
        if name_index is None:
            continue

        def value(cells, index):
            if index is None or index >= len(cells):
                return ""
            return cells[index].strip()

        for cells in grid[1:]:
            name = value(cells, name_index)
            number = value(cells, number_index)
            setup = value(cells, setup_index)
            cycle = value(cells, cycle_index)
            instructions = value(cells, instructions_index)
            notes = value(cells, notes_index)
            if not name:
                continue
            extracted.append({
                "operation_number": number,
                "operation_name": name,
                "setup_time": _normalize_setup(setup),
                "cycle_time": _normalize_cycle(cycle),
                "work_instructions": instructions,
                "notes": notes,
            })
    return extracted


@router.post("/parse-template")
def parse_template(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    name = (file.filename or "").lower()
    if not name.endswith(".docx"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a .docx file made from the operations template")
    rows = parse_operations_docx(file.file.read())
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No operations were found in the document")
    return {"rows": rows, "count": len(rows)}


@router.post("/bulk", response_model=List[OperationResponse], status_code=status.HTTP_201_CREATED)
def create_operations_bulk(
    body: OperationBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.part import Part
    from app.models.work_center import WorkCenter
    from app.models.machine import Machine

    part = db.query(Part).filter(Part.id == body.part_id).first()
    if not part:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Part not found")

    existing_numbers = db.query(Operation.operation_number).filter(Operation.part_id == body.part_id).all()
    parsed_numbers = []
    for (number,) in existing_numbers:
        try:
            parsed_numbers.append(int(number))
        except (TypeError, ValueError):
            continue
    next_number = max(parsed_numbers) + 10 if parsed_numbers else 10

    created = []
    for item in body.operations:
        work_center = db.query(WorkCenter).filter(WorkCenter.id == item.work_center_id).first()
        if not work_center:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Work center {item.work_center_id} not found")
        machine = db.query(Machine).filter(Machine.id == item.machine_id).first()
        if not machine:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Machine {item.machine_id} not found")
        if machine.work_center_id != item.work_center_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Machine must belong to the specified work center")
        number = (item.operation_number or "").strip() or str(next_number)
        if not (item.operation_number or "").strip():
            next_number += 10
        db_operation = Operation(
            part_id=body.part_id,
            operation_number=number,
            operation_name=item.operation_name.strip(),
            operation_type=item.operation_type,
            work_center_id=item.work_center_id,
            machine_id=item.machine_id,
            setup_time=item.setup_time,
            cycle_time=item.cycle_time,
            work_instructions=item.work_instructions or None,
            notes=item.notes or None,
            created_by=current_user.id,
        )
        db.add(db_operation)
        created.append(db_operation)
    db.commit()
    for operation in created:
        db.refresh(operation)
    return created


@router.post("/", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def create_operation(
    operation_data: OperationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new operation. Operation number starts at 10 and increases by 10.
    """
    # Check if part exists
    from app.models.part import Part
    part = db.query(Part).filter(Part.id == operation_data.part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Part with id {operation_data.part_id} not found"
        )
    
    # Check if work center exists
    from app.models.work_center import WorkCenter
    work_center = db.query(WorkCenter).filter(
        WorkCenter.id == operation_data.work_center_id
    ).first()
    if not work_center:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Work center with id {operation_data.work_center_id} not found"
        )
    
    # Check if machine exists
    from app.models.machine import Machine
    machine = db.query(Machine).filter(Machine.id == operation_data.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Machine with id {operation_data.machine_id} not found"
        )
    
    # Validate machine belongs to work center
    if machine.work_center_id != operation_data.work_center_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Machine must belong to the specified work center"
        )
    
    existing_numbers = db.query(Operation.operation_number).filter(
        Operation.part_id == operation_data.part_id
    ).all()
    parsed_numbers = []
    for (number,) in existing_numbers:
        try:
            parsed_numbers.append(int(number))
        except (TypeError, ValueError):
            continue
    next_number = max(parsed_numbers) + 10 if parsed_numbers else 10

    payload = operation_data.model_dump()
    payload["operation_number"] = str(next_number)
    db_operation = Operation(
        **payload,
        created_by=current_user.id
    )
    db.add(db_operation)
    db.commit()
    db.refresh(db_operation)
    return db_operation


@router.get("/", response_model=List[OperationResponse])
def get_operations(
    part_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get operations. Optionally filter by part_id.
    """
    query = db.query(Operation)
    if part_id:
        query = query.filter(Operation.part_id == part_id)
    operations = query.order_by(Operation.id.asc()).all()
    return operations


@router.get("/{operation_id}", response_model=OperationResponse)
def get_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific operation by ID.
    """
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )
    return operation


@router.get("/part/{part_id}", response_model=List[OperationResponse])
def get_operations_by_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all operations for a specific part.
    """
    operations = db.query(Operation).filter(
        Operation.part_id == part_id
    ).order_by(Operation.id.asc()).all()
    return operations


@router.put("/{operation_id}", response_model=OperationResponse)
def update_operation(
    operation_id: int,
    operation_update: OperationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an operation. Operation number stays assigned.
    """
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )
    
    update_data = operation_update.model_dump(exclude_unset=True)
    update_data.pop("operation_number", None)
    
    # Validate work_center_id and machine_id relationship if both are being updated
    if 'work_center_id' in update_data and 'machine_id' in update_data:
        from app.models.machine import Machine
        machine = db.query(Machine).filter(Machine.id == update_data['machine_id']).first()
        if machine and machine.work_center_id != update_data['work_center_id']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Machine must belong to the specified work center"
            )
    
    for field, value in update_data.items():
        setattr(operation, field, value)
    
    db.commit()
    db.refresh(operation)
    return operation


@router.delete("/{operation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an operation. Admin only.
    """
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )
    
    db.delete(operation)
    db.commit()
    return None
