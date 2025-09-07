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

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.dependencies import register_dependencies
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from app.routers import auth
from app.routers import users
from app.routers import courses
from app.routers import assessments
from app.routers import uploaded_files
from app.routers import questions
from app.routers import question_results
from app.routers import student_results
from app.routers import export

app = FastAPI(
    title="Assesment Management System",
    description="Backend for managing and grading assessment papers using FastAPI",
    version="1.0.0",
    lifespan=register_dependencies(),
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://100.90.83.38:3000", "http://100.105.155.99:3000"],  # settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("Validation error for request:", await request.body())
    print("Validation details:", exc.errors())
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


# Register DB/session/auth dependencies
# register_dependencies(app)

api_prefix = "/api/v1"

# Register routers
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(courses.router, prefix=api_prefix)
app.include_router(assessments.router, prefix=api_prefix)
app.include_router(uploaded_files.router, prefix=api_prefix)
app.include_router(questions.router, prefix=api_prefix)
app.include_router(question_results.router, prefix=api_prefix)
app.include_router(student_results.router, prefix=api_prefix)
app.include_router(export.router, prefix=api_prefix)


@app.get("/")
def root():
    return {"message": "Welcome to the Assesment Management System API"}
