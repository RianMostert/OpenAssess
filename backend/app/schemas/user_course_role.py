from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.schemas.course_role import CourseRoleOut
from app.schemas.user import UserOut
from enum import Enum


class CourseRoleNameEnum(str, Enum):
    convener = "convener"
    facilitator = "facilitator"
    student = "student"


class UserCourseRoleOut(BaseModel):
    course_id: UUID
    course_role: CourseRoleOut
    course_role_id: int

    model_config = ConfigDict(from_attributes=True)


class CourseUserOut(BaseModel):
    user_id: UUID
    user: UserOut
    course_role: CourseRoleOut
    course_role_id: int

    model_config = ConfigDict(from_attributes=True)


class AssignRoleIn(BaseModel):
    user_id: UUID
    course_id: UUID
    role_name: CourseRoleNameEnum


class AddFacilitatorIn(BaseModel):
    user_id: UUID
    role_name: CourseRoleNameEnum
