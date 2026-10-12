from sqlalchemy.orm import Session

from app.models.assembly import Assembly
from app.models.document import Document
from app.models.estimation_operation_cost import EstimationOperationCost
from app.models.operation import Operation
from app.models.part import Part
from app.storage.minio_service import minio_service


def _delete_documents(db: Session, documents: list[Document]) -> None:
    for document in documents:
        try:
            minio_service.delete_file(document.file_path)
        except Exception:
            pass
        db.delete(document)


def delete_part_tree(db: Session, part: Part) -> None:
    operations = db.query(Operation).filter(Operation.part_id == part.id).all()
    operation_ids = [operation.id for operation in operations]
    if operation_ids:
        db.query(EstimationOperationCost).filter(
            EstimationOperationCost.operation_id.in_(operation_ids)
        ).delete(synchronize_session=False)
    db.query(EstimationOperationCost).filter(
        EstimationOperationCost.part_id == part.id
    ).delete(synchronize_session=False)
    for operation in operations:
        db.delete(operation)
    documents = db.query(Document).filter(Document.part_id == part.id).all()
    _delete_documents(db, documents)
    db.delete(part)
    db.flush()


def delete_assembly_tree(db: Session, assembly: Assembly) -> None:
    children = db.query(Assembly).filter(Assembly.parent_assembly_id == assembly.id).all()
    for child in children:
        delete_assembly_tree(db, child)
    parts = db.query(Part).filter(Part.assembly_id == assembly.id).all()
    for part in parts:
        delete_part_tree(db, part)
    documents = db.query(Document).filter(Document.assembly_id == assembly.id).all()
    _delete_documents(db, documents)
    db.delete(assembly)
    db.flush()
