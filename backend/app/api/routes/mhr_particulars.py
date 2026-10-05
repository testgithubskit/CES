from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.mhr_particular import MHRParticular
from app.schemas.mhr_particular import MHRParticularCreate, MHRParticularUpdate, MHRParticularResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/v1/mhr-particulars", tags=["MHR Particulars"])


@router.post("/", response_model=MHRParticularResponse, status_code=status.HTTP_201_CREATED)
def create_mhr_particular(
    particular_data: MHRParticularCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new MHR particular. Admin only.
    """
    # Check if code already exists
    existing = db.query(MHRParticular).filter(
        MHRParticular.code == particular_data.code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MHR particular with code {particular_data.code} already exists"
        )
    
    db_particular = MHRParticular(
        **particular_data.model_dump(),
        created_by=current_user.id
    )
    db.add(db_particular)
    db.commit()
    db.refresh(db_particular)
    return db_particular


@router.get("/", response_model=List[MHRParticularResponse])
def get_mhr_particulars(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all MHR particulars. Both admin and user can access.
    """
    particulars = db.query(MHRParticular).order_by(MHRParticular.id.asc()).all()
    return particulars


@router.get("/{particular_id}", response_model=MHRParticularResponse)
def get_mhr_particular(
    particular_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific MHR particular by ID.
    """
    particular = db.query(MHRParticular).filter(MHRParticular.id == particular_id).first()
    if not particular:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MHR particular not found"
        )
    return particular


@router.put("/{particular_id}", response_model=MHRParticularResponse)
def update_mhr_particular(
    particular_id: int,
    particular_update: MHRParticularUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update an MHR particular. Admin only.
    """
    particular = db.query(MHRParticular).filter(MHRParticular.id == particular_id).first()
    if not particular:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MHR particular not found"
        )
    
    # Check if code is being updated and if it conflicts
    update_data = particular_update.model_dump(exclude_unset=True)
    if 'code' in update_data and update_data['code'] != particular.code:
        existing = db.query(MHRParticular).filter(
            MHRParticular.code == update_data['code']
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MHR particular with code {update_data['code']} already exists"
            )
    
    for field, value in update_data.items():
        setattr(particular, field, value)
    
    db.commit()
    db.refresh(particular)
    return particular


@router.delete("/{particular_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mhr_particular(
    particular_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete an MHR particular. Admin only.
    """
    particular = db.query(MHRParticular).filter(MHRParticular.id == particular_id).first()
    if not particular:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MHR particular not found"
        )
    
    # Check if particular is used by any machine
    from app.models.machine_mhr_value import MachineMHRValue
    existing_values = db.query(MachineMHRValue).filter(
        MachineMHRValue.particular_id == particular_id
    ).first()
    if existing_values:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete MHR particular - it is used by machines"
        )
    
    db.delete(particular)
    db.commit()
    return None
