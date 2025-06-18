"""
Initializes the FastAPI application.

This file:
- Creates the main FastAPI app instance.
- Configures CORS settings for frontend access.
- Registers global dependencies like database startup/shutdown hooks.
- Includes all API routers (starting with /api/v1).
- Defines the root endpoint for health checks or landing page.

All app-wide behavior (middleware, metadata, events) is configured here.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.dependencies import register_dependencies

from app.routers import users
from app.routers import courses
from app.routers import assessments
from app.routers import uploaded_files
from app.routers import questions
from app.routers import question_results

app = FastAPI(
    title="Assesment Management System",
    description="Backend for managing and grading assessment papers using FastAPI",
    version="1.0.0",
    lifespan=register_dependencies(),
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register DB/session/auth dependencies
# register_dependencies(app)

api_prefix = "/api/v1"

# Register routers
app.include_router(users.router, prefix=api_prefix)
app.include_router(courses.router, prefix=api_prefix)
app.include_router(assessments.router, prefix=api_prefix)
app.include_router(uploaded_files.router, prefix=api_prefix)
app.include_router(questions.router, prefix=api_prefix)
app.include_router(question_results.router, prefix=api_prefix)


@app.get("/")
def root():
    return {"message": "Welcome to the Assesment Management System API"}
