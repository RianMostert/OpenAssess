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
from app.models.primary_role import PrimaryRole
from app.models.course_role import CourseRole
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from app.core.auth import get_current_user
from app.core.constants import PrimaryRoles, CourseRoles


def register_dependencies():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        print("🚀 App starting...")
        yield
        print("🛑 App shutting down...")

    return lifespan


def require_course_role(required_role_id: int):
    """Factory function that creates a dependency requiring specific course role"""
    def role_checker(
        course_id: UUID,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        role_entry = (
            db.query(UserCourseRole)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                UserCourseRole.course_role_id == required_role_id,
            )
            .first()
        )

        if not role_entry:
            raise HTTPException(status_code=403, detail="Not authorized")

        return user

    return role_checker


def require_lecturer_or_facilitator_access():
    """Dependency that requires either convener or facilitator role for a course"""
    def role_checker(
        course_id: UUID,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # Check if user is admin
        if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
            return user
        
        role_entry = (
            db.query(UserCourseRole)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                UserCourseRole.course_role_id.in_([CourseRoles.CONVENER, CourseRoles.FACILITATOR])
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
        # Check if user is admin
        if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
            return user
            
        role_entry = (
            db.query(UserCourseRole)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                UserCourseRole.course_role_id.in_([CourseRoles.CONVENER, CourseRoles.FACILITATOR])
            )
            .first()
        )

        if not role_entry:
            raise HTTPException(
                status_code=403, 
                detail="Access denied. Convener or Facilitator role required for this course."
            )

        return user

    return role_checker


def validate_course_access(db: Session, user: User, course_id: UUID):
    """
    Validate that a user has access to a course (convener or facilitator).
    Raises HTTPException if access is denied.
    Note: Use require_lecturer_or_facilitator_access() dependency when course_id is available in path.
    """
    # Check if user is admin
    if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
        return
        
    # Check if user has convener or facilitator role for this course
    role_entry = (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == user.id,
            UserCourseRole.course_id == course_id,
            UserCourseRole.course_role_id.in_([CourseRoles.CONVENER, CourseRoles.FACILITATOR])
        )
        .first()
    )
    
    if not role_entry:
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Convener or Facilitator role required for this course."
        )
    
    return True
