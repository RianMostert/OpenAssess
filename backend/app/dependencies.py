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
