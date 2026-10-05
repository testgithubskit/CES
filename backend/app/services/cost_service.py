from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timezone

from app.models.product import Product
from app.models.assembly import Assembly
from app.models.part import Part
from app.models.operation import Operation
from app.models.machine import Machine
from app.models.cost_estimation import CostEstimation
from app.models.estimation_additional_cost import EstimationAdditionalCost
from app.models.estimation_operation_cost import EstimationOperationCost


class CostCalculationService:
    """
    Service for calculating manufacturing costs based on the CMF methodology.
    """
    
    @staticmethod
    def calculate_operation_cost(
        operation: Operation,
        machine_mhr: Decimal,
        quantity: Decimal
    ) -> Dict:
        """
        Calculate individual operation cost.
        Formula: (setup_time + cycle_time * quantity) * MHR
        """
        # Convert time to hours (assuming setup_time and cycle_time are in hours)
        setup_hours = Decimal(str(operation.setup_time))
        cycle_hours = Decimal(str(operation.cycle_time))
        
        # Total hours = setup + (cycle * quantity)
        total_hours = setup_hours + (cycle_hours * quantity)
        
        # Cost = total_hours * MHR
        machining_cost = total_hours * machine_mhr
        
        return {
            "operation_id": operation.id,
            "operation_number": operation.operation_number,
            "operation_name": operation.operation_name,
            "machine_id": operation.machine_id,
            "mhr_rate_snapshot": float(machine_mhr),
            "setup_hours": float(setup_hours),
            "cycle_hours": float(cycle_hours),
            "part_quantity": float(quantity),
            "total_hours": float(total_hours),
            "machining_cost": float(machining_cost)
        }
    
    @staticmethod
    def calculate_part_cost(
        part: Part,
        operations: List[Operation],
        machines_map: Dict[int, Machine],
        quantity: Decimal
    ) -> Dict:
        """
        Calculate total cost for a part by summing all operation costs.
        """
        operation_costs = []
        total_part_cost = Decimal("0")
        
        for operation in operations:
            machine = machines_map.get(operation.machine_id)
            if not machine or not machine.mhr:
                # Skip operations without valid MHR
                continue
            
            machine_mhr = Decimal(str(machine.mhr))
            op_cost = CostCalculationService.calculate_operation_cost(
                operation, machine_mhr, quantity
            )
            operation_costs.append(op_cost)
            total_part_cost += Decimal(str(op_cost["machining_cost"]))
        
        return {
            "part_id": part.id,
            "part_number": part.part_number,
            "part_name": part.part_name,
            "quantity": float(quantity),
            "operation_costs": operation_costs,
            "total_part_cost": float(total_part_cost)
        }
    
    @staticmethod
    def calculate_assembly_cost(
        assembly: Assembly,
        parts_map: Dict[int, Part],
        operations_by_part: Dict[int, List[Operation]],
        machines_map: Dict[int, Machine],
        assemblies_map: Dict[int, Assembly],
        quantity: Decimal
    ) -> Dict:
        """
        Calculate total cost for an assembly including sub-assemblies.
        """
        # Get parts directly under this assembly
        assembly_parts = [p for p in parts_map.values() if p.assembly_id == assembly.id]
        
        # Get sub-assemblies
        sub_assemblies = [a for a in assemblies_map.values() if a.parent_assembly_id == assembly.id]
        
        part_costs = []
        sub_assembly_costs = []
        total_assembly_cost = Decimal("0")
        
        # Calculate costs for direct parts
        for part in assembly_parts:
            operations = operations_by_part.get(part.id, [])
            part_cost_data = CostCalculationService.calculate_part_cost(
                part, operations, machines_map, quantity
            )
            part_costs.append(part_cost_data)
            total_assembly_cost += Decimal(str(part_cost_data["total_part_cost"]))
        
        # Calculate costs for sub-assemblies recursively
        for sub_assembly in sub_assemblies:
            sub_cost_data = CostCalculationService.calculate_assembly_cost(
                sub_assembly, parts_map, operations_by_part, machines_map, assemblies_map, quantity
            )
            sub_assembly_costs.append(sub_cost_data)
            total_assembly_cost += Decimal(str(sub_cost_data["total_assembly_cost"]))
        
        return {
            "assembly_id": assembly.id,
            "assembly_number": assembly.assembly_number,
            "assembly_name": assembly.assembly_name,
            "quantity": float(quantity),
            "part_costs": part_costs,
            "sub_assembly_costs": sub_assembly_costs,
            "total_assembly_cost": float(total_assembly_cost)
        }
    
    @staticmethod
    def calculate_product_cost(
        product: Product,
        parts: List[Part],
        assemblies: List[Assembly],
        operations_by_part: Dict[int, List[Operation]],
        machines_map: Dict[int, Machine],
        quantity: Decimal
    ) -> Dict:
        """
        Calculate total manufacturing cost for a product.
        """
        # Build maps
        parts_map = {p.id: p for p in parts}
        assemblies_map = {a.id: a for a in assemblies}
        
        # Get direct parts (not under any assembly)
        direct_parts = [p for p in parts if p.assembly_id is None]
        
        # Get root assemblies (not under any parent assembly)
        root_assemblies = [a for a in assemblies if a.parent_assembly_id is None]
        
        direct_part_costs = []
        assembly_costs = []
        total_manufacturing_cost = Decimal("0")
        
        # Calculate costs for direct parts
        for part in direct_parts:
            operations = operations_by_part.get(part.id, [])
            part_cost_data = CostCalculationService.calculate_part_cost(
                part, operations, machines_map, quantity
            )
            direct_part_costs.append(part_cost_data)
            total_manufacturing_cost += Decimal(str(part_cost_data["total_part_cost"]))
        
        # Calculate costs for root assemblies
        for assembly in root_assemblies:
            assembly_cost_data = CostCalculationService.calculate_assembly_cost(
                assembly, parts_map, operations_by_part, machines_map, assemblies_map, quantity
            )
            assembly_costs.append(assembly_cost_data)
            total_manufacturing_cost += Decimal(str(assembly_cost_data["total_assembly_cost"]))
        
        return {
            "product_id": product.id,
            "product_number": product.product_number,
            "product_name": product.product_name,
            "quantity": float(quantity),
            "direct_part_costs": direct_part_costs,
            "assembly_costs": assembly_costs,
            "total_manufacturing_cost": float(total_manufacturing_cost)
        }
    
    @staticmethod
    def create_cost_estimation(
        db: Session,
        customer_id: int,
        product_id: int,
        quantity: Decimal,
        additional_costs: List[Dict],
        created_by: int
    ) -> Dict:
        """
        Create a complete cost estimation with all cost breakdowns.
        """
        from app.models.customer import Customer
        
        # Validate customer and product exist
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Customer with id {customer_id} not found")
        
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product with id {product_id} not found")
        
        # Get all related data
        parts = db.query(Part).filter(Part.product_id == product_id).all()
        assemblies = db.query(Assembly).filter(Assembly.product_id == product_id).all()
        
        # Get operations by part
        part_ids = [p.id for p in parts]
        operations_by_part: Dict[int, List[Operation]] = {}
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
        
        machines_map: Dict[int, Machine] = {}
        if machine_ids:
            machines = db.query(Machine).filter(Machine.id.in_(machine_ids)).all()
            machines_map = {m.id: m for m in machines}
        
        # Calculate product cost
        cost_breakdown = CostCalculationService.calculate_product_cost(
            product, parts, assemblies, operations_by_part, machines_map, quantity
        )
        
        # Calculate additional costs total
        additional_costs_total = Decimal("0")
        for cost_item in additional_costs:
            additional_costs_total += Decimal(str(cost_item["cost_value"]))
        
        # Calculate grand total
        grand_total = Decimal(str(cost_breakdown["total_manufacturing_cost"])) + additional_costs_total
        
        # Create cost estimation record
        estimation_number = f"EST-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        estimation = CostEstimation(
            estimation_number=estimation_number,
            estimation_date=datetime.now(timezone.utc),
            customer_id=customer_id,
            product_id=product_id,
            quantity=quantity,
            created_by=created_by
        )
        db.add(estimation)
        db.flush()
        
        # Create estimation operation cost snapshots
        for part_cost in cost_breakdown["direct_part_costs"]:
            for op_cost in part_cost["operation_costs"]:
                est_op_cost = EstimationOperationCost(
                    estimation_id=estimation.id,
                    operation_id=op_cost["operation_id"],
                    part_id=part_cost["part_id"],
                    machine_id=op_cost["machine_id"],
                    setup_hours=Decimal(str(op_cost["setup_hours"])),
                    cycle_hours=Decimal(str(op_cost["cycle_hours"])),
                    part_quantity=Decimal(str(op_cost["part_quantity"])),
                    total_hours=Decimal(str(op_cost["total_hours"])),
                    mhr_rate_snapshot=Decimal(str(op_cost["mhr_rate_snapshot"])),
                    machining_cost=Decimal(str(op_cost["machining_cost"]))
                )
                db.add(est_op_cost)
        
        # Handle assembly operation costs recursively
        def add_assembly_operation_costs(assembly_cost: Dict):
            for part_cost in assembly_cost["part_costs"]:
                for op_cost in part_cost["operation_costs"]:
                    est_op_cost = EstimationOperationCost(
                        estimation_id=estimation.id,
                        operation_id=op_cost["operation_id"],
                        part_id=part_cost["part_id"],
                        machine_id=op_cost["machine_id"],
                        setup_hours=Decimal(str(op_cost["setup_hours"])),
                        cycle_hours=Decimal(str(op_cost["cycle_hours"])),
                        part_quantity=Decimal(str(op_cost["part_quantity"])),
                        total_hours=Decimal(str(op_cost["total_hours"])),
                        mhr_rate_snapshot=Decimal(str(op_cost["mhr_rate_snapshot"])),
                        machining_cost=Decimal(str(op_cost["machining_cost"]))
                    )
                    db.add(est_op_cost)
            
            for sub_assembly_cost in assembly_cost["sub_assembly_costs"]:
                add_assembly_operation_costs(sub_assembly_cost)
        
        for assembly_cost in cost_breakdown["assembly_costs"]:
            add_assembly_operation_costs(assembly_cost)
        
        # Create additional cost records
        for cost_item in additional_costs:
            est_add_cost = EstimationAdditionalCost(
                estimation_id=estimation.id,
                cost_name=cost_item["cost_name"],
                cost_value=Decimal(str(cost_item["cost_value"])),
                user_id=created_by
            )
            db.add(est_add_cost)
        
        db.commit()
        db.refresh(estimation)
        
        # Build response
        return {
            "estimation_id": estimation.id,
            "estimation_number": estimation.estimation_number,
            "estimation_date": str(estimation.estimation_date),
            "customer": {
                "id": customer.id,
                "company_name": customer.company_name
            },
            "product": {
                "id": product.id,
                "product_number": product.product_number,
                "product_name": product.product_name
            },
            "quantity": float(quantity),
            "cost_breakdown": cost_breakdown,
            "additional_costs": additional_costs,
            "additional_costs_total": float(additional_costs_total),
            "grand_total": float(grand_total)
        }
