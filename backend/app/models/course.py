from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class Course(Base):
    __tablename__ = "course"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    code = Column(String, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user_roles = relationship(
        "UserCourseRole", back_populates="course", cascade="all, delete"
    )

    assessments = relationship(
        "Assessment", back_populates="course", cascade="all, delete-orphan"
    )
