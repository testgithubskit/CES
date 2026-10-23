from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional

from app.database.session import get_db
from app.models.user import User
from app.models.machine import Machine
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.services.mhr_service import recalculate_machine_mhr

router = APIRouter(prefix="/api/v1/mhr", tags=["MHR Matrix"])


class MatrixParticular(BaseModel):
    id: int
    code: str
    name: str
    is_input: bool
    formula: Optional[str] = None
    sequence: Optional[int] = None
    unit: Optional[str] = None


class MatrixMachine(BaseModel):
    id: int
    label: str
    type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    mhr: Optional[float] = None
    recommended_mhr: Optional[float] = None


class MatrixValue(BaseModel):
    machine_id: int
    particular_id: int
    input_value: Optional[float] = None
    computed_value: Optional[float] = None


class MHRMatrix(BaseModel):
    particulars: List[MatrixParticular]
    machines: List[MatrixMachine]
    values: List[MatrixValue]


class InputUpdate(BaseModel):
    particular_id: int
    value: float


@router.get("/matrix", response_model=MHRMatrix)
def get_mhr_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    particulars = db.execute(text("""
        SELECT id, code, name, is_input, formula, default_sequence, unit
        FROM mhr_particular
        WHERE is_active = true
        ORDER BY default_sequence, id
    """)).mappings().all()
    machines = db.query(Machine).order_by(Machine.id.asc()).all()
    values = db.execute(text("""
        SELECT machine_id, particular_id, input_value, computed_value
        FROM machine_mhr_value
        WHERE is_applicable = true
    """)).mappings().all()
    return {
        "particulars": [
            {
                "id": row["id"],
                "code": row["code"],
                "name": row["name"],
                "is_input": row["is_input"],
                "formula": row["formula"],
                "sequence": row["default_sequence"],
                "unit": row["unit"],
            }
            for row in particulars
        ],
        "machines": [
            {
                "id": machine.id,
                "label": " ".join(part for part in [machine.type, machine.make, machine.model] if part) or machine.name,
                "type": machine.type,
                "make": machine.make,
                "model": machine.model,
                "mhr": float(machine.mhr) if machine.mhr is not None else None,
                "recommended_mhr": float(machine.recommended_mhr) if machine.recommended_mhr is not None else None,
            }
            for machine in machines
        ],
        "values": [dict(row) for row in values],
    }


@router.put("/machines/{machine_id}/inputs")
def update_machine_inputs(
    machine_id: int,
    payload: List[InputUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
    for item in payload:
        db.execute(text("""
            INSERT INTO machine_mhr_value
                (machine_id, particular_id, input_value, updated_by, is_applicable, created_at, updated_at)
            VALUES (:mid, :pid, :val, :uid, true, now(), now())
            ON CONFLICT (machine_id, particular_id)
            DO UPDATE SET input_value = :val, updated_by = :uid, updated_at = now()
        """), {"mid": machine_id, "pid": item.particular_id, "val": item.value, "uid": current_user.id})
    db.commit()
    result = recalculate_machine_mhr(db, machine_id, current_user.id)
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    return {
        "mhr": float(machine.mhr) if machine.mhr is not None else result.get("MHR"),
        "recommended_mhr": float(machine.recommended_mhr) if machine.recommended_mhr is not None else None,
    }


@router.put("/machines/{machine_id}/recommended")
def update_recommended(
    machine_id: int,
    recommended_mhr: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
    machine.recommended_mhr = recommended_mhr
    machine.mhr_updated_by = current_user.id
    db.commit()
    return {"recommended_mhr": float(machine.recommended_mhr)}
