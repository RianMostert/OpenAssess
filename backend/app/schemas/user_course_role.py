from pydantic import BaseModel, ConfigDict
from uuid import UUID
from schemas.role import RoleOut


class UserCourseRoleOut(BaseModel):
    course_id: UUID
    role: RoleOut

    model_config = ConfigDict(from_attributes=True)


class AssignRoleIn(BaseModel):
    user_id: UUID
    course_id: UUID
    role_name: str
