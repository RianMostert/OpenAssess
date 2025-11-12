# Backend - WHK6

FastAPI backend for the WHK6 application implementing a clean service layer architecture with role-based access control, comprehensive API for course management, assessments, and marking workflows.

## Architecture

The backend follows a layered architecture with clear separation of concerns:

```
backend/
├── app/
│   ├── core/              # Core configuration & security
│   │   ├── auth.py        # JWT authentication
│   │   ├── config.py      # Settings management
│   │   ├── constants.py   # Centralized constants (roles, statuses, limits)
│   │   └── security.py    # Password hashing, token generation
│   │
│   ├── crud/              # Database operations (thin CRUD layer)
│   │   ├── assessment.py
│   │   ├── course.py
│   │   ├── question.py
│   │   └── user.py
│   │
│   ├── services/          # Business logic (service layer)
│   │   ├── assessment_service.py      # Assessment statistics & logic
│   │   ├── course_service.py          # Course statistics & logic
│   │   ├── export_service.py          # CSV export generation
│   │   ├── file_storage_service.py    # File upload/download handling
│   │   └── pdf_annotation_service.py  # PDF annotation processing
│   │
│   ├── utils/             # Utilities & validators
│   │   └── validators.py  # Entity validation & access control
│   │
│   ├── models/            # SQLAlchemy ORM models
│   ├── schemas/           # Pydantic schemas (request/response validation)
│   ├── routers/           # API endpoints (thin HTTP layer)
│   ├── db/                # Database configuration
│   ├── dependencies.py    # FastAPI dependencies
│   └── main.py           # FastAPI app initialization
│
├── alembic/              # Database migrations
├── tests/                # Test suite (pytest & k6)
├── storage/              # File storage (PDFs, JSONs)
└── requirements.txt      # Python dependencies
```

## Design Principles

### Service Layer Pattern

Business logic is extracted from routers into dedicated service classes:

- **Routers**: Handle HTTP requests/responses only
- **Services**: Contain business logic, calculations, complex queries
- **CRUD**: Simple database operations (get, create, update, delete)

Example:
```python
# Router delegates to service
@router.get("/assessments/{id}/stats")
def get_stats(assessment_id: UUID, db: Session = Depends(get_db)):
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    return AssessmentStatsService.calculate_assessment_stats(db, assessment)
```

### Constants Over Magic Numbers

All magic numbers and string literals are defined in `core/constants.py`:

```python
from app.core.constants import PrimaryRoles

if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
    # Admin logic
```

Available constants:
- `PrimaryRoles`: ADMINISTRATOR (1), STAFF (2), STUDENT (3)
- `CourseRoles`: CONVENER (1), FACILITATOR (2), STUDENT (3)
- `QueryStatus`: PENDING, UNDER_REVIEW, APPROVED, REJECTED, RESOLVED
- `FileTypes`: Allowed file extensions
- `Limits`: File size limits, pagination defaults
- `Messages`: Standard error messages

### Validators for DRY Code

Reusable validation functions in `utils/validators.py`:

```python
from app.utils.validators import EntityValidator

assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
```

Available validators:
- `EntityValidator`: Entity retrieval with 404 handling
- `AccessValidator`: Permission validation (course access, convener checks)
- `FileValidator`: File type validation

## Quick Start

### Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up
```

Backend available at `http://localhost:8000`

### Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Seed the database (optional)
python seed_db.py

# Start the server
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`

## Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whk6_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Storage
QUESTION_PAPER_STORAGE_FOLDER=storage/pdfs/question_papers
ANSWER_SHEET_STORAGE_FOLDER=storage/pdfs/answer_sheets
ANNOTATION_STORAGE_FOLDER=storage/jsons/annotations

# Environment
ENV=development  # development, production, test
```

## API Documentation

Once the server is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Endpoint Categories

| Category | Prefix | Description |
|----------|--------|-------------|
| Auth | `/api/v1/auth` | Login, signup, token management |
| Users | `/api/v1/users` | User CRUD, bulk upload |
| Courses | `/api/v1/courses` | Course management, statistics, facilitators |
| Assessments | `/api/v1/assessments` | Assessment CRUD, statistics, question papers |
| Questions | `/api/v1/questions` | Question management |
| Mark Queries | `/api/v1/mark-queries` | Student query triage system |
| Export | `/api/v1/export` | PDF exports with annotations |

## Testing

Run all tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

Run k6 load tests:
```bash
./run-k6-tests.sh
```

## Database

### Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

### Database Management

Initialize database:
```bash
python init_db.py
```

Manage database (interactive):
```bash
python manage_db.py
```

Seed with test data:
```bash
python seed_db.py
```

## Security

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token expiry and refresh

### Authorization
- Role-based access control (RBAC)
- Primary roles: Administrator, Staff, Student
- Course-specific roles: Convener, Facilitator, Student

### Rate Limiting
- Applied to sensitive endpoints (login, signup)
- Configurable per environment using slowapi

## File Storage

Files are stored in the `storage/` directory:

```
storage/
├── pdfs/
│   ├── question_papers/   # course_id/assessment_id/
│   └── answer_sheets/     # course_id/assessment_id/student_id.pdf
└── jsons/
    └── annotations/       # course/assessment/student/
```

File handling services:
- `FileStorageService`: Upload, download, delete operations
- `PdfAnnotationService`: PDF annotation processing

## Code Organization

### Adding a New Feature

1. Define the model in `models/`
2. Create CRUD operations in `crud/`
3. Define Pydantic schemas in `schemas/`
4. Add business logic in `services/` (if needed)
5. Create router endpoints in `routers/`
6. Add constants to `core/constants.py` (if needed)
7. Write tests in `tests/pytests/`
8. Create migration with alembic

## Technology Stack

- **FastAPI**: Modern web framework
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **Pydantic**: Data validation
- **PyMuPDF (fitz)**: PDF processing
- **Pytest**: Testing framework
- **slowapi**: Rate limiting

## Project Structure Notes

The backend implements a strict separation of concerns:
- **Models** define database structure
- **Schemas** define API contracts
- **CRUD** handles database queries
- **Services** implement business logic
- **Routers** handle HTTP layer
- **Validators** ensure data integrity and access control

This architecture ensures maintainability, testability, and scalability.
