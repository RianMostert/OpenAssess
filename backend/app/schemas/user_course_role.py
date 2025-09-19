from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.schemas.role import RoleOut
from app.schemas.user import UserOut
from enum import Enum


class RoleNameEnum(str, Enum):
    teacher = "teacher"
    ta = "ta"
    student = "student"


class UserCourseRoleOut(BaseModel):
    course_id: UUID
    role: RoleOut
    is_convener: bool

    model_config = ConfigDict(from_attributes=True)


class CourseUserOut(BaseModel):
    user_id: UUID
    user: UserOut
    role: RoleOut
    is_convener: bool

    model_config = ConfigDict(from_attributes=True)


class AssignRoleIn(BaseModel):
    user_id: UUID
    course_id: UUID
    role_name: RoleNameEnum


class AddFacilitatorIn(BaseModel):
    user_id: UUID
    role_name: RoleNameEnum  # teacher or ta
