from pydantic import BaseModel, ConfigDict


class CourseRoleBase(BaseModel):
    name: str


class CourseRoleCreate(CourseRoleBase):
    pass


class CourseRoleUpdate(CourseRoleBase):
    name: str | None = None


class CourseRoleOut(CourseRoleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)