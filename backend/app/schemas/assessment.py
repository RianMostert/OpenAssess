from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class AssessmentCreate(BaseModel):
    title: Optional[str] = None
    course_id: UUID
    question_paper_file_path: Optional[str] = None


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    course_id: Optional[UUID] = None
    question_paper_file_path: Optional[str] = None


class AssessmentOut(BaseModel):
    id: UUID
    title: Optional[str]
    course_id: UUID
    question_paper_file_path: Optional[str]
    upload_date: datetime
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
