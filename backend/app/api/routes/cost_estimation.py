from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal

from app.database.session import get_db
from app.models.cost_estimation import CostEstimation
from app.schemas.cost_estimation import CostEstimationCreate, CostEstimationUpdate, CostEstimationResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin, require_admin_or_user
from app.services.cost_service import CostCalculationService
from app.models.user import User

router = APIRouter(prefix="/api/v1/cost-estimation", tags=["Cost Estimation"])


class AdditionalCostItem(BaseModel):
    cost_name: str
    cost_value: float


class CostCalculationRequest(BaseModel):
    customer_id: int
    product_id: int
    quantity: float
    additional_costs: List[AdditionalCostItem] = []


class CostCalculationResponse(BaseModel):
    estimation_id: Optional[int] = None
    estimation_number: Optional[str] = None
    estimation_date: Optional[str] = None
    customer: dict
    product: dict
    quantity: float
    cost_breakdown: dict
    additional_costs: List[dict]
    additional_costs_total: float
    grand_total: float


@router.post("/calculate", response_model=CostCalculationResponse)
def calculate_cost(
    request: CostCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """
    Calculate cost estimation for a product.
    Returns detailed cost breakdown without saving to database.
    """
    # Validate customer exists
    from app.models.customer import Customer
    customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {request.customer_id} not found"
        )
    
    # Validate product exists
    from app.models.product import Product
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {request.product_id} not found"
        )
    
    # Validate quantity is positive
    if request.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be positive"
        )
    
    # Get all related data
    from app.models.part import Part
    from app.models.assembly import Assembly
    from app.models.operation import Operation
    from app.models.machine import Machine
    
    parts = db.query(Part).filter(Part.product_id == request.product_id).all()
    assemblies = db.query(Assembly).filter(Assembly.product_id == request.product_id).all()
    
    # Get operations by part
    part_ids = [p.id for p in parts]
    operations_by_part = {}
    if part_ids:
        operations = db.query(Operation).filter(Operation.part_id.in_(part_ids)).all()
        for op in operations:
            if op.part_id not in operations_by_part:
                operations_by_part[op.part_id] = []
            operations_by_part[op.part_id].append(op)
    
    # Get machines
    machine_ids = set()
    for ops in operations_by_part.values():
        for op in ops:
            machine_ids.add(op.machine_id)
    
    machines_map = {}
    if machine_ids:
        machines = db.query(Machine).filter(Machine.id.in_(machine_ids)).all()
        machines_map = {m.id: m for m in machines}
    
    # Calculate product cost
    quantity = Decimal(str(request.quantity))
    cost_breakdown = CostCalculationService.calculate_product_cost(
        product, parts, assemblies, operations_by_part, machines_map, quantity
    )
    
    # Calculate additional costs total
    additional_costs_total = Decimal("0")
    additional_costs_data = []
    for cost_item in request.additional_costs:
        if cost_item.cost_value < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cost value cannot be negative for {cost_item.cost_name}"
            )
        additional_costs_total += Decimal(str(cost_item.cost_value))
        additional_costs_data.append({
            "cost_name": cost_item.cost_name,
            "cost_value": float(cost_item.cost_value)
        })
    
    # Calculate grand total
    grand_total = Decimal(str(cost_breakdown["total_manufacturing_cost"])) + additional_costs_total
    
    return CostCalculationResponse(
        estimation_id=None,
        estimation_number=None,
        estimation_date=None,
        customer={"id": customer.id, "company_name": customer.company_name},
        product={"id": product.id, "product_number": product.product_number, "product_name": product.product_name},
        quantity=float(quantity),
        cost_breakdown=cost_breakdown,
        additional_costs=additional_costs_data,
        additional_costs_total=float(additional_costs_total),
        grand_total=float(grand_total)
    )


@router.post("/save", response_model=CostEstimationResponse)
def save_cost_estimation(
    request: CostCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """
    Calculate and save a cost estimation to the database.
    Creates CostEstimation, EstimationOperationCost, and EstimationAdditionalCost records.
    """
    # Convert additional costs to dict format
    additional_costs_data = [
        {"cost_name": item.cost_name, "cost_value": item.cost_value}
        for item in request.additional_costs
    ]
    
    # Validate quantity is positive
    if request.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be positive"
        )
    
    try:
        result = CostCalculationService.create_cost_estimation(
            db=db,
            customer_id=request.customer_id,
            product_id=request.product_id,
            quantity=Decimal(str(request.quantity)),
            additional_costs=additional_costs_data,
            created_by=current_user.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create cost estimation: {str(e)}"
        )
    
    # Get the created estimation
    estimation = db.query(CostEstimation).filter(CostEstimation.id == result["estimation_id"]).first()
    
    return estimation


@router.get("/", response_model=List[CostEstimationResponse])
def get_cost_estimations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all cost estimations.
    """
    estimations = db.query(CostEstimation).order_by(CostEstimation.id.asc()).all()
    return estimations


@router.get("/{estimation_id}", response_model=CostEstimationResponse)
def get_cost_estimation(
    estimation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific cost estimation by ID.
    """
    estimation = db.query(CostEstimation).filter(CostEstimation.id == estimation_id).first()
    if not estimation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cost estimation not found"
        )
    return estimation


@router.get("/{estimation_id}/detail")
def get_cost_estimation_detail(
    estimation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed cost estimation with full breakdown.
    """
    estimation = db.query(CostEstimation).filter(CostEstimation.id == estimation_id).first()
    if not estimation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cost estimation not found"
        )
    
    # Get customer and product
    from app.models.customer import Customer
    from app.models.product import Product
    customer = db.query(Customer).filter(Customer.id == estimation.customer_id).first()
    product = db.query(Product).filter(Product.id == estimation.product_id).first()
    
    # Get estimation operation costs
    from app.models.estimation_operation_cost import EstimationOperationCost
    operation_costs = db.query(EstimationOperationCost).filter(
        EstimationOperationCost.estimation_id == estimation_id
    ).all()
    
    # Get estimation additional costs
    from app.models.estimation_additional_cost import EstimationAdditionalCost
    additional_costs = db.query(EstimationAdditionalCost).filter(
        EstimationAdditionalCost.estimation_id == estimation_id
    ).all()
    
    # Calculate totals
    additional_costs_total = sum(ac.cost_value for ac in additional_costs)
    operation_costs_total = sum(oc.machining_cost for oc in operation_costs)
    grand_total = operation_costs_total + additional_costs_total
    
    return {
        "estimation": {
            "id": estimation.id,
            "estimation_number": estimation.estimation_number,
            "estimation_date": str(estimation.estimation_date),
            "quantity": float(estimation.quantity)
        },
        "customer": {
            "id": customer.id,
            "company_name": customer.company_name
        } if customer else None,
        "product": {
            "id": product.id,
            "product_number": product.product_number,
            "product_name": product.product_name
        } if product else None,
        "operation_costs": [
            {
                "id": oc.id,
                "operation_id": oc.operation_id,
                "part_id": oc.part_id,
                "machine_id": oc.machine_id,
                "setup_hours": float(oc.setup_hours),
                "cycle_hours": float(oc.cycle_hours),
                "part_quantity": float(oc.part_quantity),
                "total_hours": float(oc.total_hours),
                "mhr_rate_snapshot": float(oc.mhr_rate_snapshot),
                "machining_cost": float(oc.machining_cost)
            }
            for oc in operation_costs
        ],
        "additional_costs": [
            {
                "id": ac.id,
                "cost_name": ac.cost_name,
                "cost_value": float(ac.cost_value)
            }
            for ac in additional_costs
        ],
        "operation_costs_total": float(operation_costs_total),
        "additional_costs_total": float(additional_costs_total),
        "grand_total": float(grand_total)
    }


@router.delete("/{estimation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost_estimation(
    estimation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a cost estimation. Admin only.
    """
    estimation = db.query(CostEstimation).filter(CostEstimation.id == estimation_id).first()
    if not estimation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cost estimation not found"
        )
    
    # Cascade delete related records
    from app.models.estimation_operation_cost import EstimationOperationCost
    from app.models.estimation_additional_cost import EstimationAdditionalCost
    
    db.query(EstimationOperationCost).filter(
        EstimationOperationCost.estimation_id == estimation_id
    ).delete(synchronize_session=False)
    
    db.query(EstimationAdditionalCost).filter(
        EstimationAdditionalCost.estimation_id == estimation_id
    ).delete(synchronize_session=False)
    
    db.delete(estimation)
    db.commit()
    return None
