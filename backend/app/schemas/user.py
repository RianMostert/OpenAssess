from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional


# Base user input for creation
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    student_number: Optional[str] = None
    password: str
    is_admin: Optional[bool] = False
    primary_role_id: Optional[int] = 3  # Default to student (id=3)


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    student_number: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    primary_role_id: Optional[int] = None


class PrimaryRoleOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class CourseRoleOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserCourseRoleOut(BaseModel):
    course_id: UUID
    course_role: CourseRoleOut

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    student_number: Optional[str]
    is_admin: bool
    primary_role_id: int
    primary_role: Optional[PrimaryRoleOut] = None
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
