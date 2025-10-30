# WHK6: A web-based system for managing and marking scanned question papers

## Description

Manually grading and managing question papers can be tedious and time-consuming. This application aims to help alleviate that by digitising the process.

## Installation

The whole application can be run using Docker. Run the following commands:

```bash
docker-compose build --no-cache
docker-compose up
```

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

## Documentation

For detailed setup instructions, features, architectures, and more, please visit the [project wiki](https://git.cs.sun.ac.za/Computer-Science/rw771/2025/24138096-WHK6-doc/-/wikis/home).