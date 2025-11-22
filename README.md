# Question Paper Management System

A web-based system for managing and marking scanned question papers.

## Description

Manually grading and managing question papers can be tedious and time-consuming. This application aims to help alleviate that by digitising the process.

## Installation

### Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <repo-directory>
   ```

2. **Set up development environment:**
   ```bash
   cp .env.dev .env
   ```

3. **Start the application:**
   ```bash
   ./manage.py start
   ```

The application will be available at:
- Frontend: http://open-assess.localhost
- Backend API: http://open-assess.localhost/api
- API Documentation: http://open-assess.localhost/api/docs
- Traefik Dashboard: http://traefik.localhost


### Quick Commands

```bash
./manage.py start              # Start all services with Traefik
./manage.py stop               # Stop all services
./manage.py restart            # Restart services
./manage.py logs               # View logs
./manage.py status             # Check container status
./manage.py env                # Show environment config
```

For full command reference: `./manage.py --help`

To shut down the application:

```bash
# Stop containers but keep data
./manage.py stop

# Stop containers and remove all data (fresh start)
./manage.py stop --volumes
```

## Demo Users

The database is automatically seeded with test users for demonstration purposes:

| Email                     | Password   | Role          | Description          |
| ------------------------- | ---------- | ------------- | -------------------- |
| admin@example.com         | admin123   | Administrator | Full system access   |
| john.smith@example.com    | staff123   | Staff         | Staff member account |
| sarah.johnson@example.com | staff123   | Staff         | Staff member account |
| alice.brown@example.com   | student123 | Student       | Student account      |
| bob.wilson@example.com    | student123 | Student       | Student account      |
| carol.davis@example.com   | student123 | Student       | Student account      |

## Features

- User authentication and role-based access control (Admin, Staff, Student)
- PDF question paper upload and management
- Digital annotation system for marking
- Student answer sheet submission
- Mark tracking and query system
- Comprehensive test coverage (unit, integration, E2E)

## Documentation

- API documentation available at http://open-assess.localhost/api/docs when running
- Frontend accessibility testing details in `frontend/A11Y.md`

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

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.