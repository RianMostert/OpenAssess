from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class CourseCreate(BaseModel):
    title: str
    teacher_id: UUID
    code: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    teacher_id: Optional[UUID] = None
    code: Optional[str] = None


class CourseOut(BaseModel):
    id: UUID
    title: str
    teacher_id: UUID
    code: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseWithRoleOut(BaseModel):
    id: UUID
    title: str
    teacher_id: UUID
    code: Optional[str]
    created_at: datetime
    role_id: int
    role_name: str

    model_config = ConfigDict(from_attributes=True)
