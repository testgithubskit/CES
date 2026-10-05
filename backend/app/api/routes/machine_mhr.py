from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

from app.database.session import get_db
from app.models.machine import Machine
from app.models.mhr_particular import MHRParticular
from app.models.machine_mhr_value import MachineMHRValue
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.services.mhr_service import recalculate_machine_mhr
from app.models.user import User

router = APIRouter(prefix="/api/v1/machines/{machine_id}/mhr", tags=["Machine MHR"])


# Schemas
class MHRValueUpdate(BaseModel):
    particular_id: int
    value: float


class MHRRecalculationResponse(BaseModel):
    context: dict
    final_mhr: Optional[float] = None


class MHRParticularDetail(BaseModel):
    id: int
    code: str
    name: str
    is_input: bool
    formula: Optional[str] = None
    default_sequence: Optional[int] = None
    unit: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True


class MachineMHRValueDetail(BaseModel):
    id: int
    machine_id: int
    particular_id: int
    is_applicable: bool
    input_value: Optional[float] = None
    computed_value: Optional[float] = None
    updated_by: Optional[int] = None
    updated_at: Optional[str] = None
    particular: MHRParticularDetail
    
    class Config:
        from_attributes = True


class MachineMHRResponse(BaseModel):
    machine_id: int
    values: List[MachineMHRValueDetail]
    final_mhr: Optional[float] = None
    recommended_mhr: Optional[float] = None
    mhr_calculated_at: Optional[str] = None


@router.get("", response_model=MachineMHRResponse)
def get_machine_mhr(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get MHR configuration for a machine.
    Returns only applicable particulars in sequence order.
    """
    # Check machine exists
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id {machine_id} not found"
        )
    
    # Get applicable values with particulars
    rows = db.execute(text("""
        SELECT mv.id, mv.machine_id, mv.particular_id, mv.is_applicable,
               mv.input_value, mv.computed_value,
               mv.updated_by, mv.updated_at,
               p.id as particular_id, p.code, p.name, p.is_input, p.formula,
               p.default_sequence, p.unit, p.is_active, p.created_by, p.created_at
        FROM machine_mhr_value mv
        JOIN mhr_particular p ON p.id = mv.particular_id
        WHERE mv.machine_id = :mid AND mv.is_applicable = true
        ORDER BY p.default_sequence
    """), {"mid": machine_id}).mappings().all()
    
    values = []
    for row in rows:
        particular_data = {
            "id": row["particular_id"],
            "code": row["code"],
            "name": row["name"],
            "is_input": row["is_input"],
            "formula": row["formula"],
            "default_sequence": row["default_sequence"],
            "unit": row["unit"],
            "is_active": row["is_active"],
        }
        value_data = {
            "id": row["id"],
            "machine_id": row["machine_id"],
            "particular_id": row["particular_id"],
            "is_applicable": row["is_applicable"],
            "input_value": row["input_value"],
            "computed_value": row["computed_value"],
            "updated_by": row["updated_by"],
            "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
            "particular": MHRParticularDetail(**particular_data),
        }
        values.append(MachineMHRValueDetail(**value_data))
    
    return MachineMHRResponse(
        machine_id=machine_id,
        values=values,
        final_mhr=float(machine.mhr) if machine.mhr else None,
        recommended_mhr=float(machine.recommended_mhr) if machine.recommended_mhr else None,
        mhr_calculated_at=str(machine.mhr_calculated_at) if machine.mhr_calculated_at else None
    )


@router.put("/values", response_model=MHRRecalculationResponse)
def update_mhr_values(
    machine_id: int,
    payload: List[MHRValueUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Bulk update input values for MHR particulars and recalculate MHR.
    Admin only.
    """
    # Check machine exists
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id {machine_id} not found"
        )
    
    for item in payload:
        db.execute(text("""
            INSERT INTO machine_mhr_value 
            (machine_id, particular_id, input_value, updated_by, is_applicable)
            VALUES (:mid, :pid, :val, :uid, true)
            ON CONFLICT (machine_id, particular_id)
            DO UPDATE SET input_value = :val, updated_by = :uid, updated_at = now()
        """), {"mid": machine_id, "pid": item.particular_id, "val": item.value, "uid": current_user.id})
    
    db.commit()
    result = recalculate_machine_mhr(db, machine_id, current_user.id)
    return {"context": result, "final_mhr": result.get("MHR")}


@router.post("/particulars/{particular_id}/toggle")
def toggle_applicable(
    machine_id: int,
    particular_id: int,
    is_applicable: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Toggle a particular on/off for a specific machine. Admin only.
    """
    # Check machine exists
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id {machine_id} not found"
        )
    
    # Check particular exists
    particular = db.query(MHRParticular).filter(MHRParticular.id == particular_id).first()
    if not particular:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Particular with id {particular_id} not found"
        )
    
    # Check if assignment exists
    existing = db.query(MachineMHRValue).filter(
        MachineMHRValue.machine_id == machine_id,
        MachineMHRValue.particular_id == particular_id
    ).first()
    
    if existing:
        existing.is_applicable = is_applicable
        existing.updated_by = current_user.id
    else:
        new_value = MachineMHRValue(
            machine_id=machine_id,
            particular_id=particular_id,
            is_applicable=is_applicable,
            updated_by=current_user.id
        )
        db.add(new_value)
    
    db.commit()
    return {"message": "Particular applicability updated successfully"}


@router.post("/particulars/{particular_id}")
def add_particular_to_machine(
    machine_id: int,
    particular_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Add a particular to a machine. Admin only.
    """
    # Check machine exists
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id {machine_id} not found"
        )
    
    # Check particular exists
    particular = db.query(MHRParticular).filter(MHRParticular.id == particular_id).first()
    if not particular:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Particular with id {particular_id} not found"
        )
    
    # Check if already exists
    existing = db.query(MachineMHRValue).filter(
        MachineMHRValue.machine_id == machine_id,
        MachineMHRValue.particular_id == particular_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Particular already assigned to this machine"
        )
    
    new_value = MachineMHRValue(
        machine_id=machine_id,
        particular_id=particular_id,
        is_applicable=True,
        updated_by=current_user.id
    )
    db.add(new_value)
    db.commit()
    return {"message": "Particular added to machine successfully"}


@router.delete("/particulars/{particular_id}")
def remove_particular_from_machine(
    machine_id: int,
    particular_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Remove a particular from a machine. Admin only.
    """
    # Check machine exists
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id {machine_id} not found"
        )
    
    # Check if assignment exists
    existing = db.query(MachineMHRValue).filter(
        MachineMHRValue.machine_id == machine_id,
        MachineMHRValue.particular_id == particular_id
    ).first()
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Particular not assigned to this machine"
        )
    
    db.delete(existing)
    db.commit()
    return {"message": "Particular removed from machine successfully"}


@router.get("/available-particulars", response_model=List[MHRParticularDetail])
def get_available_particulars(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all particulars that are NOT assigned to this machine.
    """
    # Get all active particulars
    all_particulars = db.query(MHRParticular).filter(MHRParticular.is_active == True).all()
    
    # Get assigned particular IDs for this machine
    assigned_ids = db.execute(text("""
        SELECT particular_id FROM machine_mhr_value
        WHERE machine_id = :mid
    """), {"mid": machine_id}).scalars().all()
    
    # Filter out assigned ones
    available = [p for p in all_particulars if p.id not in assigned_ids]
    
    return available


@router.put("/recommended-mhr")
def update_recommended_mhr(
    machine_id: int,
    recommended_mhr: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update the human-adjusted recommended MHR. Admin only.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id {machine_id} not found"
        )
    
    machine.recommended_mhr = recommended_mhr
    machine.mhr_updated_by = current_user.id
    db.commit()
    return {"message": "Recommended MHR updated successfully", "recommended_mhr": recommended_mhr}
