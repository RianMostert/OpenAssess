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

## Development

### Development Mode with Hot Reloading

The application has separate configurations for development and production:

**Development Mode:**
- Uses `Dockerfile.dev` and `docker-compose.dev.yml`
- Mounts local code as volumes for instant hot reloading
- Backend: `uvicorn --reload` for automatic Python restarts
- Frontend: `next dev` for instant Hot Module Replacement (HMR)

**Production Mode:**
- Uses standard `Dockerfile` and `docker-compose.yml`
- Optimized builds with no volume mounts
- Backend: Standard uvicorn server
- Frontend: Standalone Next.js build

**Quick Start:**
1. Copy the development environment file:
   ```bash
   cp .env.dev .env
   ```

2. Start in development mode:
   ```bash
   ./manage.py dev
   ```

3. Make changes to your code:
   - **Backend**: Edit files in `backend/app/` - server auto-restarts
   - **Frontend**: Edit files in `frontend/src/` - browser hot-reloads instantly

**Important Notes:**
- **Adding Python dependencies**: Add to `backend/requirements.txt` and rebuild with `./manage.py dev --build`
- **Adding Node dependencies**: Update `frontend/package.json` and rebuild with `./manage.py dev --build`
- The rebuild is necessary because dependencies are installed during the Docker image build

**Switching between modes:**
```bash
# Development with hot reloading
./manage.py dev

# Production mode
./manage.py start

# Rebuild when switching or after dependency changes
./manage.py dev --build
```

### Running Tests

**Backend tests:**
```bash
cd backend
pytest                           # Run all tests
pytest --cov=app                 # With coverage
```

**Frontend tests:**
```bash
cd frontend
pnpm run test                    # Unit tests (Vitest)
pnpm run test:e2e                # E2E tests (Playwright)
pnpm run test:a11y               # Accessibility tests
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.