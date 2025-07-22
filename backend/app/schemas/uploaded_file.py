from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class UploadedFileCreate(BaseModel):
    assessment_id: UUID
    student_id: UUID
    answer_sheet_file_path: str
    uploaded_by: UUID


class UploadedFileUpdate(BaseModel):
    answer_sheet_file_path: Optional[str] = None


class UploadedFileOut(BaseModel):
    id: UUID
    assessment_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    student_number: Optional[str] = None
    answer_sheet_file_path: str
    uploaded_by: UUID
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
