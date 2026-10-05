from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import io

from app.database.session import get_db
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.core.dependencies import get_current_user
from app.core.rbac import require_admin
from app.storage.minio_service import minio_service
from app.models.user import User

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])

# Allowed file types
ALLOWED_FILE_TYPES = {
    'application/pdf': 'pdf',
    'model/stl': 'stl',
    'model/stl-ascii': 'stl',
    'model/stl-binary': 'stl',
    'application/sla': 'stl',
    'application/step': 'step',
    'application/octet-stream': 'step',  # STEP files often use this MIME type
}


def _validate_file_type(file: UploadFile) -> str:
    """
    Validate file type and return the extension.
    """
    content_type = file.content_type or 'application/octet-stream'
    
    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {content_type} not allowed. Allowed types: {list(ALLOWED_FILE_TYPES.keys())}"
        )
    
    return ALLOWED_FILE_TYPES[content_type]


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    part_id: int = None,
    assembly_id: int = None,
    document_type: str = None,
    version: str = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document (PDF/STL/STEP) to MinIO. 
    Must specify either part_id or assembly_id.
    """
    # Validate that either part_id or assembly_id is provided
    if part_id is None and assembly_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either part_id or assembly_id must be provided"
        )
    
    # Validate part exists if provided
    if part_id:
        from app.models.part import Part
        part = db.query(Part).filter(Part.id == part_id).first()
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Part with id {part_id} not found"
            )
    
    # Validate assembly exists if provided
    if assembly_id:
        from app.models.assembly import Assembly
        assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
        if not assembly:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assembly with id {assembly_id} not found"
            )
    
    # Validate file type
    file_extension = _validate_file_type(file)
    
    # Read file content
    file_content = file.file.read()
    
    # Generate unique object name
    object_name = minio_service.generate_object_name(file.filename)
    
    # Upload to MinIO
    try:
        file_path = minio_service.upload_file(
            file_data=io.BytesIO(file_content),
            original_filename=file.filename,
            content_type=file.content_type,
            object_name=object_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to MinIO: {str(e)}"
        )
    
    # Create document record in database
    try:
        db_document = Document(
            part_id=part_id,
            assembly_id=assembly_id,
            file_name=file.filename,
            file_type=file_extension,
            document_type=document_type,
            version=version,
            file_path=file_path,
            uploaded_by=current_user.id
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
    except Exception as e:
        # Rollback database and delete from MinIO
        db.rollback()
        try:
            minio_service.delete_file(object_name)
        except:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document record: {str(e)}"
        )
    
    return db_document


@router.get("/", response_model=List[DocumentResponse])
def get_documents(
    part_id: int = None,
    assembly_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get documents. Filter by part_id or assembly_id.
    """
    query = db.query(Document)
    
    if part_id:
        query = query.filter(Document.part_id == part_id)
    
    if assembly_id:
        query = query.filter(Document.assembly_id == assembly_id)
    
    documents = query.order_by(Document.id.asc()).all()
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get document metadata by ID.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a document file from MinIO.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Extract object name from file_path
    object_name = document.file_path
    
    try:
        file_content = minio_service.download_file(object_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file from MinIO: {str(e)}"
        )
    
    return Response(
        content=file_content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={document.file_name}"}
    )


@router.get("/{document_id}/url")
def get_document_url(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a presigned URL for document access.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Extract object name from file_path
    object_name = document.file_path
    
    try:
        url = minio_service.get_file_url(object_name, expires_in_hours=24)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {str(e)}"
        )
    
    return {"url": url, "file_name": document.file_name}


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    document_update: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update document metadata (document_type, version). Admin only.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    update_data = document_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a document from database and MinIO. Admin only.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete from MinIO
    object_name = document.file_path
    try:
        minio_service.delete_file(object_name)
    except Exception as e:
        # Log error but continue with database deletion
        print(f"Warning: Failed to delete file from MinIO: {e}")
    
    # Delete from database
    db.delete(document)
    db.commit()
    return None
