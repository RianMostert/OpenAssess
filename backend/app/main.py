from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.dependencies import register_dependencies
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

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
from app.db.base import Base  # adjust if Base is declared elsewhere

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Assesment Management System",
    description="Backend for managing and grading assessment papers using FastAPI",
    version="1.0.0",
    lifespan=register_dependencies(),
)

# Add rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create tables if they don’t exist
Base.metadata.create_all(bind=engine)

# CORS Middleware - use origins from settings/environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # HSTS - Force HTTPS (only enable if deployed behind HTTPS)
    if settings.ENV == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    # Prevent MIME sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    # Control referrer information
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Basic CSP - adjust based on your needs
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none'"
    )
    # Prevent XSS in older browsers
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


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
app.include_router(
    student_queries.router,
    prefix=f"{api_prefix}/student-queries",
    tags=["student-queries"],
)
app.include_router(
    mark_queries.router, prefix=f"{api_prefix}/mark-queries", tags=["mark-queries"]
)


@app.get("/")
def root():
    return {"message": "Welcome to the Assesment Management System API"}


@app.get("/api/health")
def health_check():
    """Health check endpoint for container orchestration"""
    return {"status": "healthy", "service": "openassess-api"}
