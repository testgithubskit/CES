from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.machine import Machine
from app.schemas.machine import MachineCreate, MachineUpdate, MachineResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/machines", tags=["Machines"])


@router.post("/", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(
    machine_data: MachineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new machine. Admin only.
    """
    # Check if work center exists
    from app.models.work_center import WorkCenter
    work_center = db.query(WorkCenter).filter(WorkCenter.id == machine_data.work_center_id).first()
    if not work_center:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Work center with id {machine_data.work_center_id} not found"
        )
    
    db_machine = Machine(**machine_data.model_dump())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


@router.get("/", response_model=List[MachineResponse])
def get_machines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all machines. Both admin and user can access.
    """
    machines = db.query(Machine).order_by(Machine.id.asc()).all()
    return machines


@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific machine by ID.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found"
        )
    return machine


@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(
    machine_id: int,
    machine_update: MachineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a machine. Admin only.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found"
        )
    
    # Check if work_center_id is being updated and if the new work center exists
    update_data = machine_update.model_dump(exclude_unset=True)
    if 'work_center_id' in update_data:
        from app.models.work_center import WorkCenter
        work_center = db.query(WorkCenter).filter(WorkCenter.id == update_data['work_center_id']).first()
        if not work_center:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Work center with id {update_data['work_center_id']} not found"
            )
    
    for field, value in update_data.items():
        setattr(machine, field, value)
    
    db.commit()
    db.refresh(machine)
    return machine


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a machine. Admin only.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found"
        )
    
    # Check if machine has existing operations
    from app.models.operation import Operation
    existing_operations = db.query(Operation).filter(
        Operation.machine_id == machine_id
    ).first()
    
    if existing_operations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete machine - it has existing operations"
        )
    
    db.delete(machine)
    db.commit()
    return None


@router.get("/work-center/{work_center_id}", response_model=List[MachineResponse])
def get_machines_by_work_center(
    work_center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all machines for a specific work center.
    """
    from app.models.work_center import WorkCenter
    work_center = db.query(WorkCenter).filter(WorkCenter.id == work_center_id).first()
    if not work_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work center not found"
        )
    
    machines = db.query(Machine).filter(Machine.work_center_id == work_center_id).all()
    return machines
