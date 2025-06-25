from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserCourseRole(Base):
    __tablename__ = "user_course_role"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("course.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id = Column(
        Integer,
        ForeignKey("role.id", ondelete="CASCADE"),
        primary_key=True,
    )

    user = relationship("User", back_populates="course_roles")
    course = relationship("Course", back_populates="user_roles")
    role = relationship("Role", back_populates="user_course_roles")
