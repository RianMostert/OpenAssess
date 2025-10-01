from sqlalchemy import Column, ForeignKey, String, Text, DateTime, CheckConstraint, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class MarkQuery(Base):
    __tablename__ = "mark_query"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    assessment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("assessment.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id = Column(UUID(as_uuid=True), ForeignKey("question.id", ondelete="CASCADE"), nullable=True)
    batch_id = Column(UUID(as_uuid=True), nullable=True, index=True) 
    current_mark = Column(Float, nullable=True)
    requested_change = Column(Text, nullable=False)
    query_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    
    # Response fields
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    reviewer_response = Column(Text, nullable=True)
    new_mark = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    assessment = relationship("Assessment", back_populates="mark_queries")
    question = relationship("Question", foreign_keys=[question_id])

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'under_review', 'approved', 'rejected', 'resolved')",
            name="check_status"
        ),
        CheckConstraint(
            "query_type IN ('regrade', 'clarification', 'technical_issue')",
            name="check_query_type"
        ),
    )