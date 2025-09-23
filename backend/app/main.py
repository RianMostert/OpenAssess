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
from app.routers import student_queries
from app.routers import mark_queries

# Import your DB stuff
from app.db.session import engine
from app.db.base import Base   # adjust if Base is declared elsewhere

app = FastAPI(
    title="Assesment Management System",
    description="Backend for managing and grading assessment papers using FastAPI",
    version="1.0.0",
    lifespan=register_dependencies(),
)

# Create tables if they don’t exist
Base.metadata.create_all(bind=engine)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://100.90.83.38:3000",
        "http://100.105.155.99:3000",
    ],
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
app.include_router(student_queries.router, prefix=f"{api_prefix}/student-queries", tags=["student-queries"])
app.include_router(mark_queries.router, prefix=f"{api_prefix}/mark-queries", tags=["mark-queries"])


@app.get("/")
def root():
    return {"message": "Welcome to the Assesment Management System API"}
