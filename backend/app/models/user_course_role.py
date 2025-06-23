from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserCourseRole(Base):
    __tablename__ = "user_course_role"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    course_id = Column(
        UUID(as_uuid=True), ForeignKey("course.id", ondelete="CASCADE"), nullable=False
    )
    role_id = Column(Integer, ForeignKey("role.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint(
            "user_id", "course_id", "role_id", name="user_course_role_pk"
        ),
    )

    user = relationship("User", back_populates="course_roles")
    course = relationship("Course", back_populates="user_roles")
    role = relationship("Role", back_populates="user_course_roles")
