from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.user import User
from app.models.product import Product
from app.models.part import Part
from app.models.operation import Operation
from app.models.machine import Machine
from app.models.product_additional_cost import ProductAdditionalCost
from app.core.dependencies import get_current_user
from app.core.time_utils import time_to_hours, hours_to_clock

router = APIRouter(prefix="/api/v1/products", tags=["Product Cost"])

PRESET_COSTS = [
    "Tooling Cost",
    "Fixture Cost",
    "Inspection Cost",
    "Documentation Cost",
    "Inspection & Documentation Cost",
    "Packaging Cost",
    "Transportation Cost",
]


class AdditionalCostBody(BaseModel):
    cost_name: str = Field(..., min_length=1, max_length=255)
    cost_value: float = Field(..., ge=0)


class OperationCostRow(BaseModel):
    machine_name: str
    part_id: int
    part_name: str
    part_number: str
    quantity: int
    operation_number: str
    operation_name: str
    setup_time: str
    cycle_time: str
    machining_time: str
    mhr_rate: float
    cost_per_operation: float
    part_total_time: str
    part_total_cost: float
    cost_per_qty: float
    cost_for_overall_qty: float


class AdditionalCostRow(BaseModel):
    id: int
    cost_name: str
    cost_value: float


class ProductCostSummary(BaseModel):
    product_id: int
    product_name: str
    product_number: str
    quantity: int
    total_setup_time: str
    total_cycle_time: str
    total_time: str
    total_machining_cost: float
    additional_costs: List[AdditionalCostRow]
    additional_total: float
    grand_total: float
    presets: List[str]
    operations: List[OperationCostRow]


def _money(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01")))


def build_summary(db: Session, product: Product) -> dict:
    parts = db.query(Part).filter(Part.product_id == product.id).all()
    part_ids = [part.id for part in parts]
    operations = (
        db.query(Operation).filter(Operation.part_id.in_(part_ids)).all()
        if part_ids else []
    )
    machine_ids = {operation.machine_id for operation in operations}
    machines = {
        machine.id: machine
        for machine in db.query(Machine).filter(Machine.id.in_(machine_ids)).all()
    } if machine_ids else {}

    setup_total = Decimal("0")
    cycle_total = Decimal("0")
    machining_total = Decimal("0")
    part_hours = {}
    part_costs = {}
    rows = []

    for operation in operations:
        part = next((item for item in parts if item.id == operation.part_id), None)
        if part is None:
            continue
        quantity = Decimal(int(part.quantity or 1))
        if quantity <= 0:
            quantity = Decimal("1")
        setup = time_to_hours(operation.setup_time or "0")
        cycle = time_to_hours(operation.cycle_time or "0")
        machining = setup + (cycle * quantity)
        machine = machines.get(operation.machine_id)
        rate = Decimal("0")
        if machine is not None:
            raw = machine.recommended_mhr if machine.recommended_mhr is not None else machine.mhr
            if raw is not None:
                rate = Decimal(str(raw))
        cost = machining * rate
        per_qty = cost / quantity
        setup_total += setup
        cycle_total += cycle * quantity
        machining_total += cost
        part_hours[part.id] = part_hours.get(part.id, Decimal("0")) + machining
        part_costs[part.id] = part_costs.get(part.id, Decimal("0")) + cost
        rows.append({
            "machine_name": machine.name if machine is not None else "",
            "part_id": part.id,
            "part_name": part.part_name,
            "part_number": part.part_number,
            "quantity": int(quantity),
            "operation_number": operation.operation_number,
            "operation_name": operation.operation_name,
            "setup_time": operation.setup_time,
            "cycle_time": operation.cycle_time,
            "machining_time": hours_to_clock(machining),
            "mhr_rate": _money(rate),
            "cost_per_operation": _money(cost),
            "cost_per_qty": _money(per_qty),
            "cost_for_overall_qty": _money(cost),
            "_part_id": part.id,
        })

    rows.sort(key=lambda row: (row["machine_name"], row["part_number"], row["operation_number"]))
    for row in rows:
        part_id = row.pop("_part_id")
        row["part_total_time"] = hours_to_clock(part_hours[part_id])
        row["part_total_cost"] = _money(part_costs[part_id])

    extras = (
        db.query(ProductAdditionalCost)
        .filter(ProductAdditionalCost.product_id == product.id)
        .order_by(ProductAdditionalCost.id.asc())
        .all()
    )
    additional_total = sum((Decimal(str(item.cost_value)) for item in extras), Decimal("0"))
    return {
        "product_id": product.id,
        "product_name": product.product_name,
        "product_number": product.product_number,
        "quantity": int(product.quantity or 1),
        "total_setup_time": hours_to_clock(setup_total),
        "total_cycle_time": hours_to_clock(cycle_total),
        "total_time": hours_to_clock(setup_total + cycle_total),
        "total_machining_cost": _money(machining_total),
        "additional_costs": [
            {"id": item.id, "cost_name": item.cost_name, "cost_value": _money(Decimal(str(item.cost_value)))}
            for item in extras
        ],
        "additional_total": _money(additional_total),
        "grand_total": _money(machining_total + additional_total),
        "presets": PRESET_COSTS,
        "operations": rows,
    }


def _product_or_404(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/{product_id}/cost", response_model=ProductCostSummary)
def get_product_cost(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _product_or_404(db, product_id)
    return build_summary(db, product)


@router.post("/{product_id}/additional-costs", response_model=ProductCostSummary, status_code=status.HTTP_201_CREATED)
def add_additional_cost(
    product_id: int,
    payload: AdditionalCostBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _product_or_404(db, product_id)
    db.add(ProductAdditionalCost(
        product_id=product.id,
        cost_name=payload.cost_name.strip(),
        cost_value=payload.cost_value,
        created_by=current_user.id,
    ))
    db.commit()
    return build_summary(db, product)


@router.delete("/{product_id}/additional-costs/{cost_id}", response_model=ProductCostSummary)
def delete_additional_cost(
    product_id: int,
    cost_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _product_or_404(db, product_id)
    row = db.query(ProductAdditionalCost).filter(
        ProductAdditionalCost.id == cost_id,
        ProductAdditionalCost.product_id == product.id,
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Additional cost not found")
    db.delete(row)
    db.commit()
    return build_summary(db, product)
