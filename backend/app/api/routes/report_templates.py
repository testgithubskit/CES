from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.database.session import get_db
from app.models.report_template import ReportTemplate
from app.models.user import User
from app.schemas.report_template import ReportTemplateCreate, ReportTemplateResponse, ReportTemplateUpdate

router = APIRouter(prefix="/api/v1/report-templates", tags=["Report Templates"])

STARTER_DATA = {
    "pageSize": "A4",
    "orientation": "portrait",
    "margins": {"top": 5, "right": 5, "bottom": 5, "left": 5},
    "headerSpacing": 0,
    "footerSpacing": 0,
    "fontFamily": "Calibri",
    "fontSize": "14px",
    "customPlaceholders": [],
    "headerHtml": "<p><strong>Cost Estimation Report</strong></p><p>{{product_name}} · {{product_number}}</p>",
    "bodyHtml": "<p>Customer: {{company_name}}</p><p>Contact: {{customer_name}} · {{email}} · {{mobile}}</p><p>Date: {{date}} · Qty {{quantity}}</p><p>{{operations_table}}</p><p>Setup {{total_setup_time}} · Cycle {{total_cycle_time}} · Total {{total_time}}</p><p>Machining {{total_machining_cost}} · Additional {{additional_total}}</p><p><strong>Grand total {{grand_total}}</strong></p><p>{{additional_costs}}</p>",
    "footerHtml": "<p>{{product_number}} · {{company_name}}</p>",
}

_table_ready = False


def ensure_schema(db: Session) -> None:
    global _table_ready
    if _table_ready:
        return
    ReportTemplate.__table__.create(bind=db.get_bind(), checkfirst=True)
    _table_ready = True


def ensure_starter(db: Session) -> None:
    if db.query(ReportTemplate).first():
        return
    db.add(ReportTemplate(name="Cost summary", is_default=True, template_data=STARTER_DATA))
    db.commit()


def set_default(db: Session, template: ReportTemplate) -> None:
    db.query(ReportTemplate).filter(ReportTemplate.id != template.id).update({"is_default": False})
    template.is_default = True


def as_response(template: ReportTemplate) -> ReportTemplate:
    if template.template_data is None:
        template.template_data = {}
    return template


@router.get("/", response_model=list[ReportTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_schema(db)
    ensure_starter(db)
    return db.query(ReportTemplate).order_by(ReportTemplate.is_default.desc(), ReportTemplate.updated_at.desc()).all()


@router.get("/starred", response_model=ReportTemplateResponse)
def get_starred_template(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_schema(db)
    ensure_starter(db)
    template = (
        db.query(ReportTemplate)
        .filter(ReportTemplate.is_default.is_(True))
        .order_by(ReportTemplate.updated_at.desc())
        .first()
    ) or db.query(ReportTemplate).order_by(ReportTemplate.id.asc()).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No report template found")
    return as_response(template)


@router.get("/{template_id}", response_model=ReportTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_schema(db)
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return as_response(template)


@router.post("/", response_model=ReportTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    body: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ensure_schema(db)
    template = ReportTemplate(
        name=body.name.strip(),
        is_default=False,
        template_data=body.template_data or {},
        created_by=current_user.id,
    )
    db.add(template)
    db.flush()
    if body.is_default or not db.query(ReportTemplate).filter(ReportTemplate.is_default.is_(True)).first():
        set_default(db, template)
    db.commit()
    db.refresh(template)
    return as_response(template)


@router.put("/{template_id}", response_model=ReportTemplateResponse)
def update_template(
    template_id: int,
    body: ReportTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ensure_schema(db)
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        template.name = data["name"].strip()
    if "template_data" in data and data["template_data"] is not None:
        template.template_data = data["template_data"]
    if data.get("is_default"):
        set_default(db, template)
    db.commit()
    db.refresh(template)
    return as_response(template)


@router.post("/{template_id}/star", response_model=ReportTemplateResponse)
def star_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ensure_schema(db)
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    set_default(db, template)
    db.commit()
    db.refresh(template)
    return as_response(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ensure_schema(db)
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    was_default = template.is_default
    db.delete(template)
    db.flush()
    remaining = db.query(ReportTemplate).order_by(ReportTemplate.id.asc()).first()
    if remaining and (was_default or not db.query(ReportTemplate).filter(ReportTemplate.is_default.is_(True)).first()):
        remaining.is_default = True
    if not remaining:
        ensure_starter(db)
    db.commit()
    return None
