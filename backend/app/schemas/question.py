from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class QuestionCreate(BaseModel):
    assessment_id: UUID
    question_number: str
    max_marks: Optional[float] = None
    increment: Optional[float] = None
    memo: Optional[str] = None
    marking_note: Optional[str] = None
    page_number: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    updated_memo_at: Optional[datetime] = None


class QuestionUpdate(BaseModel):
    question_number: Optional[str] = None
    max_marks: Optional[float] = None
    increment: Optional[float] = None
    memo: Optional[str] = None
    marking_note: Optional[str] = None
    page_number: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    updated_memo_at: Optional[datetime] = None


class QuestionOut(BaseModel):
    id: UUID
    assessment_id: UUID
    question_number: str
    max_marks: Optional[float]
    increment: Optional[float]
    memo: Optional[str]
    marking_note: Optional[str]
    page_number: Optional[int]
    x: Optional[float]
    y: Optional[float]
    width: Optional[float]
    height: Optional[float]
    created_at: datetime
    updated_memo_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
