from pydantic import BaseModel, ConfigDict
from uuid import UUID
from schemas.role import RoleOut
from enum import Enum


class RoleNameEnum(str, Enum):
    teacher = "teacher"
    ta = "ta"
    student = "student"


class UserCourseRoleOut(BaseModel):
    course_id: UUID
    role: RoleOut

    model_config = ConfigDict(from_attributes=True)


class AssignRoleIn(BaseModel):
    user_id: UUID
    course_id: UUID
    role_name: RoleNameEnum
