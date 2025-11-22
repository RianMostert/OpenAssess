# Question Paper Management System

A web-based system for managing and marking scanned question papers.

## Description

Manually grading and managing question papers can be tedious and time-consuming. This application aims to help alleviate that by digitising the process.

## Installation

### Prerequisites
- Docker and Docker Compose installed on your system
- Git

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <repo-directory>
   ```

2. **Configure environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
   
   See `SETUP.md` for detailed configuration instructions.

3. **Start the application:**
   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

To shut down the application:

```bash
# Stop containers but keep data
docker-compose down

# Stop containers and remove all data (fresh start)
docker-compose down -v
```

## Demo Users

The database is automatically seeded with test users for demonstration purposes:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@example.com | admin123 | Administrator | Full system access |
| john.smith@example.com | staff123 | Staff | Staff member account |
| sarah.johnson@example.com | staff123 | Staff | Staff member account |
| alice.brown@example.com | student123 | Student | Student account |
| bob.wilson@example.com | student123 | Student | Student account |
| carol.davis@example.com | student123 | Student | Student account |

## Features

- User authentication and role-based access control (Admin, Staff, Student)
- PDF question paper upload and management
- Digital annotation system for marking
- Student answer sheet submission
- Mark tracking and query system
- Comprehensive test coverage (unit, integration, E2E)

## Documentation

- See `SETUP.md` for detailed setup and configuration
- API documentation available at http://localhost:8000/docs when running
- Frontend accessibility testing details in `frontend/A11Y.md`
- PDF annotation system documentation in `frontend/PDF_ANNOTATION_SYSTEM.md`

## Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy
- Alembic (migrations)
- JWT authentication

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- PDF.js for PDF rendering
- Vitest & Playwright for testing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.