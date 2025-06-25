from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class QuestionResultCreate(BaseModel):
    student_id: UUID
    assessment_id: UUID
    question_id: UUID
    mark: Optional[float] = None
    comment: Optional[str] = None
    annotation_file_path: Optional[str] = None
    updated_at: Optional[datetime] = None


class QuestionResultUpdate(BaseModel):
    mark: Optional[float] = None
    comment: Optional[str] = None
    annotation_file_path: Optional[str] = None
    updated_at: Optional[datetime] = None


class QuestionResultOut(BaseModel):
    id: UUID
    student_id: UUID
    assessment_id: UUID
    question_id: UUID
    marker_id: UUID
    mark: Optional[float]
    comment: Optional[str]
    annotation_file_path: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
