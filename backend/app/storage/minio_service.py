from minio import Minio
from minio.error import S3Error
from app.core.config import settings
from typing import Optional, BinaryIO
import uuid


class MinIOService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """
        Ensure the configured bucket exists, create it if it doesn't.
        """
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            raise Exception(f"Failed to ensure bucket exists: {e}")
    
    def generate_object_name(self, original_filename: str) -> str:
        """
        Generate a unique object name to avoid conflicts.
        """
        file_extension = original_filename.rsplit('.', 1)[-1] if '.' in original_filename else ''
        unique_name = f"{uuid.uuid4()}"
        if file_extension:
            return f"{unique_name}.{file_extension}"
        return unique_name
    
    def upload_file(
        self,
        file_data: BinaryIO,
        original_filename: str,
        content_type: str,
        object_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to MinIO storage.
        
        Returns the object path.
        """
        if object_name is None:
            object_name = self.generate_object_name(original_filename)
        
        try:
            self.client.put_object(
                self.bucket_name,
                object_name,
                file_data,
                length=-1,  # Let MinIO determine the length
                part_size=10 * 1024 * 1024,  # 10MB parts
                content_type=content_type
            )
            return object_name
        except S3Error as e:
            raise Exception(f"Failed to upload file: {e}")
    
    def file_exists(self, object_name: str) -> bool:
        """
        Check if a file exists in the bucket.
        """
        try:
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False
    
    def get_file_url(self, object_name: str, expires_in_hours: int = 24) -> str:
        """
        Generate a presigned URL for file access.
        """
        try:
            url = self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=expires_in_hours * 3600
            )
            return url
        except S3Error as e:
            raise Exception(f"Failed to generate presigned URL: {e}")
    
    def download_file(self, object_name: str) -> bytes:
        """
        Download a file from MinIO.
        """
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            return response.read()
        except S3Error as e:
            raise Exception(f"Failed to download file: {e}")
    
    def delete_file(self, object_name: str) -> bool:
        """
        Delete a file from MinIO.
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error as e:
            raise Exception(f"Failed to delete file: {e}")


# Global MinIO service instance
minio_service = MinIOService()
