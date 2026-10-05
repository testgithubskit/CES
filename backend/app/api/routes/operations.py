from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.operation import Operation
from app.schemas.operation import OperationCreate, OperationUpdate, OperationResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/operations", tags=["Operations"])


@router.post("/", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def create_operation(
    operation_data: OperationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new operation. Admin only.
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
    
    # Validate times are non-negative
    if operation_data.setup_time < 0 or operation_data.cycle_time < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup time and cycle time cannot be negative"
        )
    
    db_operation = Operation(
        **operation_data.model_dump(),
        created_by=current_user.id
    )
    db.add(db_operation)
    db.commit()
    db.refresh(db_operation)
    return db_operation


@router.get("/", response_model=List[OperationResponse])
def get_operations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all operations. Both admin and user can access.
    """
    operations = db.query(Operation).order_by(Operation.id.asc()).all()
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
    current_user: User = Depends(require_admin)
):
    """
    Update an operation. Admin only.
    """
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )
    
    update_data = operation_update.model_dump(exclude_unset=True)
    
    # Validate work_center_id and machine_id relationship if both are being updated
    if 'work_center_id' in update_data and 'machine_id' in update_data:
        from app.models.machine import Machine
        machine = db.query(Machine).filter(Machine.id == update_data['machine_id']).first()
        if machine and machine.work_center_id != update_data['work_center_id']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Machine must belong to the specified work center"
            )
    
    # Validate times are non-negative
    if 'setup_time' in update_data and update_data['setup_time'] < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup time cannot be negative"
        )
    if 'cycle_time' in update_data and update_data['cycle_time'] < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cycle time cannot be negative"
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
    current_user: User = Depends(require_admin)
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
