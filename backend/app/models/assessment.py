from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class Assessment(Base):
    __tablename__ = "assessment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    course_id = Column(
        UUID(as_uuid=True), ForeignKey("course.id", ondelete="CASCADE"), nullable=False
    )
    question_paper_file_path = Column(Text)
    published = Column(Boolean, default=False, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    course = relationship("Course", back_populates="assessments")
    questions = relationship(
        "Question", back_populates="assessment", cascade="all, delete-orphan"
    )
    uploaded_files = relationship(
        "UploadedFile", back_populates="assessment", cascade="all, delete-orphan"
    )
    question_results = relationship(
        "QuestionResult", back_populates="assessment", cascade="all, delete-orphan"
    )
    mark_queries = relationship(
        "MarkQuery", back_populates="assessment", cascade="all, delete-orphan"
    )
