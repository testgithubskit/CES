from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.work_center import WorkCenter
from app.schemas.work_center import WorkCenterCreate, WorkCenterUpdate, WorkCenterResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User
from app.schemas.listing import RecordList
from app.services.custom_fields import apply_values, catalog, pop_custom, with_fields

router = APIRouter(prefix="/api/v1/work-centers", tags=["Work Centers"])


@router.post("/", response_model=WorkCenterResponse, status_code=status.HTTP_201_CREATED)
def create_work_center(
    work_center_data: WorkCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new work center. Admin only.
    """
    payload = work_center_data.model_dump()
    custom_fields = pop_custom(payload)
    db_work_center = WorkCenter(**payload)
    db.add(db_work_center)
    db.flush()
    apply_values(db, "work_center", db_work_center.id, custom_fields)
    db.commit()
    db.refresh(db_work_center)
    return with_fields(db, "work_center", db_work_center, WorkCenterResponse)


@router.get("/", response_model=RecordList[WorkCenterResponse])
def get_work_centers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all work centers, including custom column definitions. Both admin and user can access.
    """
    work_centers = db.query(WorkCenter).order_by(WorkCenter.id.asc()).all()
    return catalog(db, "work_center", work_centers, WorkCenterResponse)


@router.get("/{work_center_id}", response_model=WorkCenterResponse)
def get_work_center(
    work_center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific work center by ID.
    """
    work_center = db.query(WorkCenter).filter(WorkCenter.id == work_center_id).first()
    if not work_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work center not found"
        )
    return with_fields(db, "work_center", work_center, WorkCenterResponse)


@router.put("/{work_center_id}", response_model=WorkCenterResponse)
def update_work_center(
    work_center_id: int,
    work_center_update: WorkCenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a work center. Admin only.
    """
    work_center = db.query(WorkCenter).filter(WorkCenter.id == work_center_id).first()
    if not work_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work center not found"
        )
    
    update_data = work_center_update.model_dump(exclude_unset=True)
    custom_fields = pop_custom(update_data)
    for field, value in update_data.items():
        setattr(work_center, field, value)
    apply_values(db, "work_center", work_center.id, custom_fields)
    db.commit()
    db.refresh(work_center)
    return with_fields(db, "work_center", work_center, WorkCenterResponse)


@router.delete("/{work_center_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_center(
    work_center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a work center. Admin only.
    """
    work_center = db.query(WorkCenter).filter(WorkCenter.id == work_center_id).first()
    if not work_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work center not found"
        )
    
    # Check if work center has existing machines
    from app.models.machine import Machine
    existing_machines = db.query(Machine).filter(
        Machine.work_center_id == work_center_id
    ).first()
    
    if existing_machines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete work center - it has existing machines"
        )
    
    db.delete(work_center)
    db.commit()
    return None
