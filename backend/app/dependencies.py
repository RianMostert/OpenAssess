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
from app.db.session import SessionLocal


# The actual dependency function used in routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def register_dependencies():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        print("🚀 App starting...")
        yield
        print("🛑 App shutting down...")

    return lifespan
