from sqlalchemy import Column, ForeignKey, String, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class UploadedFile(Base):
    __tablename__ = "uploaded_file"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(
        UUID(as_uuid=True), ForeignKey("assessment.id"), nullable=False
    )
    student_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    answer_sheet_file_path = Column(String, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index(
            "uq_uploaded_file_assessment_student",
            "assessment_id",
            "student_id",
            unique=True,
        ),
    )
