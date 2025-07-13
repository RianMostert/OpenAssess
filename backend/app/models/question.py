from sqlalchemy import (
    Column,
    ForeignKey,
    String,
    Float,
    Integer,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class Question(Base):
    __tablename__ = "question"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("assessment.id", ondelete="CASCADE"),
        nullable=False,
    )

    question_number = Column(String, nullable=False)
    max_marks = Column(Float)
    increment = Column(Float)
    memo = Column(String)
    marking_note = Column(String)
    page_number = Column(Integer)
    x = Column(Float)
    y = Column(Float)
    width = Column(Float)
    height = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_memo_at = Column(DateTime(timezone=True), nullable=True)

    assessment = relationship("Assessment", back_populates="questions")
    question_results = relationship(
        "QuestionResult", back_populates="question", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "assessment_id", "question_number", name="uq_question_number_per_assessment"
        ),
    )
