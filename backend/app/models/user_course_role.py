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
    
    # Reference to course_role table
    course_role_id = Column(
        Integer,
        ForeignKey("course_role.id", ondelete="CASCADE"),
        nullable=False,
        default=3  # Default to student (id=3)
    )

    user = relationship("User", back_populates="course_roles")
    course = relationship("Course", back_populates="user_roles")
    course_role = relationship("CourseRole", back_populates="user_course_roles")
