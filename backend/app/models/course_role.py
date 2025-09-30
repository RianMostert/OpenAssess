from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class CourseRole(Base):
    __tablename__ = "course_role"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    user_course_roles = relationship("UserCourseRole", back_populates="course_role")