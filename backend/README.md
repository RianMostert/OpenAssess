# Backend – WHK6

FastAPI backend for the WHK6 application with a clean service layer architecture, role-based access control, and comprehensive API for course management, assessments, and marking workflows.

---

## 🏗️ Architecture

The backend follows a **layered architecture** with clear separation of concerns:

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
│   │   └── ...
│   │
│   ├── services/          # Business logic (service layer)
│   │   ├── assessment_service.py      # Assessment statistics & logic
│   │   ├── course_service.py          # Course statistics & logic
│   │   ├── export_service.py          # CSV export generation
│   │   ├── file_storage_service.py    # File upload/download handling
│   │   └── pdf_annotation_service.py  # PDF annotation with eraser detection
│   │
│   ├── utils/             # Utilities & validators
│   │   └── validators.py  # Entity validation & access control
│   │
│   ├── models/            # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── assessment.py
│   │   └── ...
│   │
│   ├── schemas/           # Pydantic schemas (request/response validation)
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── assessment.py
│   │   └── ...
│   │
│   ├── routers/           # API endpoints (thin HTTP layer)
│   │   ├── auth.py        # Login, signup
│   │   ├── users.py       # User management
│   │   ├── courses.py     # Course CRUD & stats
│   │   ├── assessments.py # Assessment CRUD & stats
│   │   ├── questions.py   # Question management
│   │   ├── mark_queries.py # Mark query triage system
│   │   ├── export.py      # PDF export with annotations
│   │   └── ...
│   │
│   ├── db/                # Database configuration
│   │   ├── session.py     # SQLAlchemy session
│   │   └── base.py        # Base model
│   │
│   ├── dependencies.py    # FastAPI dependencies
│   └── main.py           # FastAPI app initialization
│
├── alembic/              # Database migrations
├── tests/                # Test suite
├── storage/              # File storage (PDFs, JSONs)
└── requirements.txt      # Python dependencies
```

---

## 🎯 Design Principles

### 1. **Service Layer Pattern**
Business logic is extracted from routers into dedicated service classes:
- **Routers**: Handle HTTP requests/responses only
- **Services**: Contain business logic, calculations, complex queries
- **CRUD**: Simple database operations (get, create, update, delete)

**Example:**
```python
# ❌ Bad: Business logic in router
@router.get("/assessments/{id}/stats")
def get_stats(assessment_id: UUID, db: Session = Depends(get_db)):
    # 200+ lines of statistics calculation...
    
# ✅ Good: Delegate to service
@router.get("/assessments/{id}/stats")
def get_stats(assessment_id: UUID, db: Session = Depends(get_db)):
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    return AssessmentStatsService.calculate_assessment_stats(db, assessment)
```

### 2. **Constants Over Magic Numbers**
All magic numbers and string literals are defined in `core/constants.py`:

```python
# ❌ Bad: Magic numbers
if user.primary_role_id == 1:  # What is 1?
    
# ✅ Good: Named constants
from app.core.constants import PrimaryRoles
if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
```

**Available Constants:**
- `PrimaryRoles`: ADMINISTRATOR (1), STAFF (2), STUDENT (3)
- `CourseRoles`: CONVENER (1), FACILITATOR (2), STUDENT (3)
- `QueryStatus`: PENDING, UNDER_REVIEW, APPROVED, REJECTED, RESOLVED
- `FileTypes`: Allowed file extensions
- `Limits`: File size limits, pagination limits
- `Messages`: Standard error messages

### 3. **Validators for DRY Code**
Reusable validation functions in `utils/validators.py`:

```python
# ❌ Bad: Repeated validation code
assessment = db.query(Assessment).filter(Assessment.id == id).first()
if not assessment:
    raise HTTPException(status_code=404, detail="Assessment not found")

# ✅ Good: Use validator
from app.utils.validators import EntityValidator
assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
```

**Available Validators:**
- `EntityValidator`: `get_assessment_or_404()`, `get_course_or_404()`, etc.
- `AccessValidator`: `validate_course_access()`, `validate_convener_access()`, etc.
- `FileValidator`: `validate_pdf_file()`, `validate_csv_file()`

---

## 🚀 Quick Start

### Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up
```

The backend will be available at `http://localhost:8000`

### Manual Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

3. **Run database migrations:**
```bash
alembic upgrade head
```

4. **Seed the database (optional):**
```bash
python seed_db.py
```

5. **Start the server:**
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

---

## 🔑 Environment Variables

Create a `.env` file with the following variables:

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

See `.env.example` for all available options.

---

## 📚 API Documentation

### Interactive Docs

Once the server is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoint Categories

| Category | Prefix | Description |
|----------|--------|-------------|
| **Auth** | `/api/v1/auth` | Login, signup, token management |
| **Users** | `/api/v1/users` | User CRUD, bulk upload |
| **Courses** | `/api/v1/courses` | Course management, stats, facilitators |
| **Assessments** | `/api/v1/assessments` | Assessment CRUD, stats, question papers |
| **Questions** | `/api/v1/questions` | Question management |
| **Mark Queries** | `/api/v1/mark-queries` | Student query triage system |
| **Export** | `/api/v1/export` | PDF exports with annotations |

For detailed endpoint documentation, see [API_ENDPOINTS.md](./API_ENDPOINTS.md)

---

## 🧪 Testing

### Run all tests:
```bash
pytest
```

### Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

### Run specific test file:
```bash
pytest tests/pytests/test_auth.py
```

### Run k6 load tests:
```bash
./run-k6-tests.sh
```

See [TESTING_DOCUMENTATION.md](./TESTING_DOCUMENTATION.md) for comprehensive testing guide.

---

## 🗄️ Database

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

---

## 🔐 Security

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token expiry and refresh

### Authorization
- Role-based access control (RBAC)
- Three primary roles: Administrator, Staff, Student
- Course-specific roles: Convener, Facilitator, Student

### Rate Limiting
- Applied to sensitive endpoints (login, signup)
- Configurable per environment
- See `slowapi` configuration in routers

See [SECURITY.md](./SECURITY.md) for security best practices.

---

## 📁 File Storage

Files are stored in the `storage/` directory:

```
storage/
├── pdfs/
│   ├── question_papers/   # Organized by course_id/assessment_id/
│   └── answer_sheets/     # Organized by course_id/assessment_id/student_id.pdf
└── jsons/
    └── annotations/       # PDF annotations organized by course/assessment/student/
```

**File Handling Services:**
- `FileStorageService`: Upload, download, delete operations
- `PdfAnnotationService`: PDF annotation with sophisticated eraser detection

---

## 🏛️ Code Organization

### Adding a New Feature

1. **Define the model** in `models/`
2. **Create CRUD operations** in `crud/`
3. **Define Pydantic schemas** in `schemas/`
4. **Add business logic** in `services/` (if needed)
5. **Create router endpoints** in `routers/`
6. **Add constants** to `core/constants.py` (if needed)
7. **Write tests** in `tests/pytests/`
8. **Create migration** with alembic

### Service Layer Guidelines

**When to create a service:**
- Complex business logic (>30 lines)
- Multiple database queries
- Calculations or data transformations
- Logic reused across endpoints

**When to keep logic in router:**
- Simple CRUD operations
- Direct database query + response
- No business rules

---

## 🔄 Recent Refactoring (Nov 2025)

The backend underwent major refactoring to improve maintainability:

✅ **Service layer extraction**: 800+ lines of business logic moved to services  
✅ **Constants centralization**: 40+ magic numbers replaced with named constants  
✅ **Validator creation**: 60+ validation blocks consolidated  
✅ **Router simplification**: Average router size reduced by 51%

See [REFACTORING_CHANGELOG.md](./REFACTORING_CHANGELOG.md) for detailed changes.

---

## 📖 Additional Documentation

- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)**: Complete API endpoint reference
- **[SECURITY.md](./SECURITY.md)**: Security guidelines and best practices
- **[TESTING_DOCUMENTATION.md](./TESTING_DOCUMENTATION.md)**: Testing guide
- **[REFACTORING_CHANGELOG.md](./REFACTORING_CHANGELOG.md)**: Refactoring history
- **[Project Wiki](https://git.cs.sun.ac.za/Computer-Science/rw771/2025/24138096-WHK6-doc/-/wikis/Backend)**: Comprehensive backend documentation

---

## 🛠️ Development Tools

- **FastAPI**: Modern web framework
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **Pydantic**: Data validation
- **PyMuPDF (fitz)**: PDF processing
- **Pytest**: Testing framework
- **slowapi**: Rate limiting

---

## 📞 Support

For questions or issues:
1. Check the [Project Wiki](https://git.cs.sun.ac.za/Computer-Science/rw771/2025/24138096-WHK6-doc/-/wikis/home)
2. Review existing documentation in this directory
3. Contact the development team

---

**Last Updated:** November 10, 2025  
**Version:** 2.0 (Post-Refactoring)