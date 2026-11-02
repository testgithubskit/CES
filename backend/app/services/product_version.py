import re

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.assembly import Assembly
from app.models.custom_field import CustomField
from app.models.document import Document
from app.models.operation import Operation
from app.models.part import Part
from app.models.product import Product
from app.models.product_additional_cost import ProductAdditionalCost
from app.storage.minio_service import minio_service


def _safe(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", str(value or "").strip())
    return cleaned or "file"


def _is_first_version(value: str) -> bool:
    text = str(value or "").strip().lower()
    if text.startswith("v"):
        text = text[1:].strip()
    return text == "1"


def _clean_version(value: str) -> str:
    text = " ".join(str(value or "").split())
    if not text or len(text) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a version such as v2 or 1.1")
    return text


def create_product_version(db: Session, product_id: int, part_ids: list[int], version: str, user_id: int) -> Product:
    source = db.query(Product).filter(Product.id == product_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    assemblies = db.query(Assembly).filter(Assembly.product_id == product_id).all()
    parts = db.query(Part).options(
        selectinload(Part.operations),
        selectinload(Part.documents),
    ).filter(Part.product_id == product_id).all()
    known_parts = {part.id for part in parts}
    chosen = set(part_ids)
    unknown = chosen - known_parts
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select parts from this product only")

    assembly_by_id = {assembly.id: assembly for assembly in assemblies}
    needed = set()
    for part in parts:
        if part.id not in chosen or not part.assembly_id:
            continue
        current = part.assembly_id
        while current and current not in needed:
            needed.add(current)
            parent = assembly_by_id.get(current)
            current = parent.parent_assembly_id if parent else None

    if not _is_first_version(source.version):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create a new version from version 1")
    label = _clean_version(version)
    siblings = db.query(Product.version).filter(Product.product_number == source.product_number).all()
    if any(str(existing or "").strip().lower() == label.lower() for (existing,) in siblings):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This version already exists")
    created = Product(
        product_number=source.product_number,
        product_name=source.product_name,
        quantity=source.quantity,
        version=label,
        description=source.description,
        created_by=user_id,
    )
    db.add(created)
    db.flush()

    for row in db.query(CustomField).filter(CustomField.entity_type == "product", CustomField.entity_id == source.id).all():
        db.add(CustomField(
            entity_type="product",
            entity_id=created.id,
            field_key=row.field_key,
            label=row.label,
            field_type=row.field_type,
            max_length=row.max_length,
            is_required=row.is_required,
            sort_order=row.sort_order,
            value=row.value,
        ))

    for cost in db.query(ProductAdditionalCost).filter(ProductAdditionalCost.product_id == source.id).all():
        db.add(ProductAdditionalCost(
            product_id=created.id,
            cost_name=cost.cost_name,
            cost_value=cost.cost_value,
            created_by=user_id,
        ))

    assembly_map = {}
    pending = [assembly for assembly in assemblies if assembly.id in needed]
    while pending:
        ready = [
            assembly for assembly in pending
            if not assembly.parent_assembly_id or assembly.parent_assembly_id in assembly_map
        ]
        if not ready:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assembly tree could not be copied")
        pending = [assembly for assembly in pending if assembly not in ready]
        for assembly in ready:
            copy = Assembly(
                product_id=created.id,
                parent_assembly_id=assembly_map.get(assembly.parent_assembly_id),
                assembly_number=assembly.assembly_number,
                assembly_name=assembly.assembly_name,
                created_by=user_id,
            )
            db.add(copy)
            db.flush()
            assembly_map[assembly.id] = copy.id
            _copy_documents(
                db,
                db.query(Document).filter(Document.assembly_id == assembly.id).all(),
                user_id,
                created.id,
                assembly_id=copy.id,
                owner=_safe(assembly.assembly_number),
            )

    for part in parts:
        if part.id not in chosen:
            continue
        copy = Part(
            product_id=created.id,
            assembly_id=assembly_map.get(part.assembly_id) if part.assembly_id else None,
            part_number=part.part_number,
            part_name=part.part_name,
            description=part.description,
            size=part.size,
            quantity=part.quantity,
            created_by=user_id,
        )
        db.add(copy)
        db.flush()
        for operation in part.operations:
            db.add(Operation(
                part_id=copy.id,
                operation_number=operation.operation_number,
                operation_name=operation.operation_name,
                operation_type=operation.operation_type,
                work_center_id=operation.work_center_id,
                machine_id=operation.machine_id,
                setup_time=operation.setup_time,
                cycle_time=operation.cycle_time,
                work_instructions=operation.work_instructions,
                notes=operation.notes,
                created_by=user_id,
            ))
        _copy_documents(
            db,
            part.documents,
            user_id,
            created.id,
            part_id=copy.id,
            owner=_safe(part.part_number),
        )

    return created


def _copy_documents(db: Session, documents, user_id: int, product_id: int, owner: str, part_id: int | None = None, assembly_id: int | None = None) -> None:
    for document in documents:
        if not document.file_path:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{document.file_name} has no stored file")
        revision = _safe(document.version or "00")
        dest = f"products/{product_id}/{owner}/{part_id or assembly_id}/v{revision}/{_safe(document.file_name)}"
        try:
            minio_service.copy_file(document.file_path, dest)
        except Exception as error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not copy {document.file_name}") from error
        db.info.setdefault("copied_files", []).append(dest)
        db.add(Document(
            part_id=part_id,
            assembly_id=assembly_id,
            file_name=document.file_name,
            file_type=document.file_type,
            document_type=document.document_type,
            version=document.version,
            file_path=dest,
            uploaded_by=user_id,
        ))
