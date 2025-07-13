from sqlalchemy import Column, ForeignKey, Float, String, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class QuestionResult(Base):
    __tablename__ = "question_result"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    assessment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("assessment.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id = Column(
        UUID(as_uuid=True),
        ForeignKey("question.id", ondelete="CASCADE"),
        nullable=False,
    )
    marker_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    mark = Column(Float)
    comment = Column(String)
    annotation_file_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    marker = relationship("User", foreign_keys=[marker_id])
    assessment = relationship("Assessment", back_populates="question_results")
    question = relationship("Question", back_populates="question_results")

    __table_args__ = (
        Index(
            "uq_question_result_assessment_student_question",
            "assessment_id",
            "student_id",
            "question_id",
            unique=True,
        ),
    )
