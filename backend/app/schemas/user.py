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
    primary_role_id: int


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    student_number: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None


class RoleOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserCourseRoleOut(BaseModel):
    course_id: UUID
    role: RoleOut

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    student_number: Optional[str]
    is_admin: bool
    primary_role: Optional[RoleOut]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
