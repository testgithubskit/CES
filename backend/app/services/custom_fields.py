import re

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.custom_field import CustomField

ENTITY_TYPES = {"product", "work_center", "machine", "customer", "user"}

RESERVED_LABELS = {
    "sl no",
    "action",
    "actions",
    "id",
    "product no",
    "product number",
    "product",
    "product name",
    "qty",
    "quantity",
    "description",
    "created by",
    "created at",
    "version",
    "code",
    "work center",
    "name",
    "type",
    "make",
    "model",
    "year",
    "cnc controller",
    "service",
    "remarks",
    "mhr",
    "company",
    "branch",
    "contact",
    "email",
    "phone",
    "address",
    "role",
    "status",
    "password",
}


def require_entity(entity_type: str) -> str:
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown record type")
    return entity_type


def definitions(db: Session, entity_type: str) -> list[CustomField]:
    return (
        db.query(CustomField)
        .filter(CustomField.entity_type == entity_type, CustomField.entity_id.is_(None))
        .order_by(CustomField.sort_order.asc(), CustomField.id.asc())
        .all()
    )


def value_map(db: Session, entity_type: str, entity_ids: list[int]) -> dict[int, dict[str, str]]:
    if not entity_ids:
        return {}
    rows = (
        db.query(CustomField)
        .filter(CustomField.entity_type == entity_type, CustomField.entity_id.in_(entity_ids))
        .all()
    )
    grouped: dict[int, dict[str, str]] = {}
    for row in rows:
        grouped.setdefault(row.entity_id, {})[row.field_key] = row.value or ""
    return grouped


def as_dict(fields: list[CustomField], stored: dict[str, str] | None) -> dict[str, str]:
    values = stored or {}
    return {field.field_key: values.get(field.field_key, "") for field in fields}


def as_entries(fields: list[CustomField], stored: dict[str, str] | None) -> list[dict]:
    values = stored or {}
    return [
        {"key": field.field_key, "label": field.label, "value": values.get(field.field_key, "")}
        for field in fields
    ]


def with_fields(db: Session, entity_type: str, item, schema):
    fields = definitions(db, entity_type)
    stored = value_map(db, entity_type, [item.id]).get(item.id, {})
    return schema.model_validate(item).model_copy(update={"custom_fields": as_dict(fields, stored)})


def catalog(db: Session, entity_type: str, items, schema):
    return {
        "items": with_fields_many(db, entity_type, items, schema),
        "custom_columns": definitions(db, entity_type),
    }


def with_fields_many(db: Session, entity_type: str, items, schema):
    fields = definitions(db, entity_type)
    stored = value_map(db, entity_type, [item.id for item in items])
    return [
        schema.model_validate(item).model_copy(update={"custom_fields": as_dict(fields, stored.get(item.id, {}))})
        for item in items
    ]


def entries_for_entity(db: Session, entity_type: str, entity_id: int) -> list[dict]:
    fields = definitions(db, entity_type)
    stored = value_map(db, entity_type, [entity_id]).get(entity_id, {})
    return as_entries(fields, stored)


def _unique_key(db: Session, entity_type: str, label: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")[:32] or "field"
    key = base
    suffix = 2
    while (
        db.query(CustomField)
        .filter(CustomField.entity_type == entity_type, CustomField.entity_id.is_(None), CustomField.field_key == key)
        .first()
    ):
        key = f"{base}_{suffix}"[:40]
        suffix += 1
    return key


def _clean_label(db: Session, entity_type: str, label: str, current_id: int | None = None) -> str:
    cleaned = " ".join(label.split())
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column name is required")
    if len(cleaned) > 40:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column name must be 40 characters or fewer")
    if cleaned.lower() in RESERVED_LABELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That name is already a built-in column")
    existing = (
        db.query(CustomField)
        .filter(
            CustomField.entity_type == entity_type,
            CustomField.entity_id.is_(None),
            func.lower(CustomField.label) == cleaned.lower(),
        )
        .first()
    )
    if existing and existing.id != current_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A column with that name already exists")
    return cleaned


def create_definition(db: Session, entity_type: str, label: str, field_type: str, max_length: int | None, is_required: bool = False) -> CustomField:
    require_entity(entity_type)
    if field_type not in ("text", "number"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column type must be text or number")
    cleaned = _clean_label(db, entity_type, label)
    length = 40 if field_type == "number" else int(max_length or 40)
    if length < 1 or length > 120:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Character limit must be between 1 and 120")
    last = (
        db.query(func.max(CustomField.sort_order))
        .filter(CustomField.entity_type == entity_type, CustomField.entity_id.is_(None))
        .scalar()
        or 0
    )
    field = CustomField(
        entity_type=entity_type,
        entity_id=None,
        label=cleaned,
        field_key=_unique_key(db, entity_type, cleaned),
        field_type=field_type,
        max_length=length,
        is_required=bool(is_required),
        sort_order=int(last) + 1,
        value=None,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


def update_definition(db: Session, entity_type: str, field_id: int, label: str, field_type: str, max_length: int | None, is_required: bool = False) -> CustomField:
    require_entity(entity_type)
    field = (
        db.query(CustomField)
        .filter(CustomField.id == field_id, CustomField.entity_type == entity_type, CustomField.entity_id.is_(None))
        .first()
    )
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    if field_type not in ("text", "number"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column type must be text or number")
    length = 40 if field_type == "number" else int(max_length or field.max_length or 40)
    if length < 1 or length > 120:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Character limit must be between 1 and 120")
    field.label = _clean_label(db, entity_type, label, field.id)
    field.field_type = field_type
    field.max_length = length
    field.is_required = bool(is_required)
    rows = (
        db.query(CustomField)
        .filter(CustomField.entity_type == entity_type, CustomField.field_key == field.field_key, CustomField.entity_id.isnot(None))
        .all()
    )
    for row in rows:
        row.label = field.label
        row.field_type = field.field_type
        row.max_length = field.max_length
    db.commit()
    db.refresh(field)
    return field


def delete_definition(db: Session, entity_type: str, field_id: int) -> None:
    require_entity(entity_type)
    field = (
        db.query(CustomField)
        .filter(CustomField.id == field_id, CustomField.entity_type == entity_type, CustomField.entity_id.is_(None))
        .first()
    )
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    db.query(CustomField).filter(CustomField.entity_type == entity_type, CustomField.field_key == field.field_key).delete()
    db.commit()


def apply_values(db: Session, entity_type: str, entity_id: int, payload: dict | None) -> None:
    if payload is None:
        return
    fields = {field.field_key: field for field in definitions(db, entity_type)}
    if set(payload) - set(fields):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown columns")
    existing = {
        row.field_key: row
        for row in db.query(CustomField).filter(CustomField.entity_type == entity_type, CustomField.entity_id == entity_id).all()
    }
    for field in fields.values():
        if not field.is_required:
            continue
        raw = payload.get(field.field_key)
        if raw is None or not str(raw).strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field.label} is required")
    for key, raw in payload.items():
        field = fields[key]
        value = "" if raw is None else str(raw).strip()
        if value and field.field_type == "number":
            try:
                number = float(value)
            except ValueError as error:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field.label} must be a number") from error
            value = str(int(number)) if number.is_integer() else str(number)
        elif value and len(value) > field.max_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field.label} must be {field.max_length} characters or fewer",
            )
        row = existing.get(key)
        if not value:
            if row:
                db.delete(row)
            continue
        if row:
            row.value = value
            row.label = field.label
            continue
        db.add(CustomField(
            entity_type=entity_type,
            entity_id=entity_id,
            field_key=field.field_key,
            label=field.label,
            field_type=field.field_type,
            max_length=field.max_length,
            sort_order=field.sort_order,
            value=value,
        ))


def pop_custom(data: dict):
    return data.pop("custom_fields", None)
