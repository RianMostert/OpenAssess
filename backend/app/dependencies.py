"""
Defines shared dependencies used across the FastAPI application.

- `get_db`: Provides a SQLAlchemy database session for each request.
  This function is used with FastAPI's dependency injection system
  to ensure sessions are created and closed safely per request.

- `register_dependencies`: Optional function to register startup
  and shutdown event handlers for the FastAPI app. Can be extended
  later to initialize services, loggers, schedulers, etc.

Will need to add get_current_user and require_admin later
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.session import get_db
from uuid import UUID

from app.models.user import User
from app.models.user_course_role import UserCourseRole
from app.models.role import Role
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from app.core.auth import get_current_user


def register_dependencies():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        print("🚀 App starting...")
        yield
        print("🛑 App shutting down...")

    return lifespan


def require_course_role(required_role: str):
    def role_checker(
        course_id: UUID,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        role_entry = (
            db.query(UserCourseRole)
            .join(Role)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                Role.name == required_role,
            )
            .first()
        )

        if not role_entry:
            raise HTTPException(status_code=403, detail="Not authorized")

        return user

    return role_checker


def require_lecturer_or_ta_access():
    """Dependency that requires either teacher or ta role for a course"""
    def role_checker(
        course_id: UUID,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        role_entry = (
            db.query(UserCourseRole)
            .join(Role)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                Role.name.in_(['teacher', 'ta'])
            )
            .first()
        )

        if not role_entry:
            raise HTTPException(
                status_code=403, 
                detail="Access denied. Lecturer or TA role required for this course."
            )

        return user

    return role_checker


def validate_course_access(db: Session, user: User, course_id: UUID):
    """
    Validate that a user has access to a course (teacher or TA).
    Raises HTTPException if access is denied.
    Note: Use require_lecturer_or_ta_access() dependency when course_id is available in path.
    """
    # Check if user has teacher or TA role for this course
    role_entry = (
        db.query(UserCourseRole)
        .join(Role)
        .filter(
            UserCourseRole.user_id == user.id,
            UserCourseRole.course_id == course_id,
            Role.name.in_(['teacher', 'ta'])
        )
        .first()
    )
    
    if not role_entry:
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Lecturer or TA role required for this course."
        )
    
    return True
