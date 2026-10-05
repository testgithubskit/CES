import re
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from typing import Optional, Dict
from app.models.machine import Machine
from app.models.mhr_particular import MHRParticular
from app.models.machine_mhr_value import MachineMHRValue

# Safe formula evaluation - only allow numbers, operators, and variable names
_ALLOWED = re.compile(r'^[0-9A-Za-z_+\-*/(). ]+$')


def safe_eval(expr: str, context: Dict[str, float]) -> float:
    """
    Safely evaluate a mathematical expression with given context variables.
    Only allows numbers, basic operators, and parentheses.
    """
    expr = expr.strip()
    if not _ALLOWED.match(expr):
        raise ValueError(f"Unsafe characters in formula: {expr}")
    
    # Substitute known codes (longest names first to avoid partial matches)
    for code in sorted(context, key=len, reverse=True):
        expr = re.sub(rf'\b{re.escape(code)}\b', repr(context[code]), expr)
    
    # Check if any variables remain unresolved
    if re.search(r'[A-Za-z_]', expr):
        raise ValueError(f"Unresolved variable(s) in formula: {expr}")
    
    # Evaluate with no builtins
    return eval(expr, {"__builtins__": {}}, {})


def recalculate_machine_mhr(db: Session, machine_id: int, user_id: Optional[int] = None) -> Dict[str, float]:
    """
    Recalculate MHR for a machine based on its applicable MHR particulars.
    This follows the CMF methodology:
    1. Load applicable particulars in sequence order
    2. Resolve input values
    3. Evaluate formulas in sequence (each formula can reference previous values)
    4. Calculate final MHR
    5. Update machine.mhr and machine.recommended_mhr
    """
    # Get applicable MHR values with particulars, ordered by sequence
    rows = db.execute(text("""
        SELECT mv.id, p.code, p.is_input, p.formula,
               mv.input_value, mv.computed_value
        FROM machine_mhr_value mv
        JOIN mhr_particular p ON p.id = mv.particular_id
        WHERE mv.machine_id = :mid AND mv.is_applicable = true
        ORDER BY p.default_sequence
    """), {"mid": machine_id}).mappings().all()
    
    context = {}
    updates = []
    
    for row in rows:
        if row["is_input"]:
            value = row["input_value"]
            if value is None:
                raise ValueError(f"Missing input value for {row['code']}")
        else:
            # Evaluate formula using current context
            value = safe_eval(row["formula"], context)
            updates.append((row["id"], value))
        
        context[row["code"]] = value
    
    # Persist computed values
    for value_id, value in updates:
        if user_id is not None:
            db.execute(text("""
                UPDATE machine_mhr_value
                SET computed_value = :v, updated_by = :uid, updated_at = now()
                WHERE id = :id
            """), {"v": value, "uid": user_id, "id": value_id})
        else:
            db.execute(text("""
                UPDATE machine_mhr_value
                SET computed_value = :v, updated_at = now()
                WHERE id = :id
            """), {"v": value, "id": value_id})
    
    # Update machine MHR if MHR particular exists in context
    mhr_value = context.get("MHR")
    if mhr_value is not None:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if machine:
            machine.mhr = round(mhr_value, 2)
            machine.recommended_mhr = round(mhr_value, 2)  # Auto-copy to recommended MHR
            machine.mhr_calculated_at = datetime.now(timezone.utc)
            if user_id is not None:
                machine.mhr_updated_by = user_id
    
    db.commit()
    return context
