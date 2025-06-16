# Backend Structure Overview

This FastAPI backend is organized into modular subfolders, each with a clear responsibility:

## app/models/
Contains SQLAlchemy models — each one maps to a table in the database.
- Example: `user.py` defines the `User` table structure.

## app/schemas/
Contains Pydantic schemas used for request validation and response formatting.
- Keeps API input/output strict and secure.

## app/crud/
Contains functions for database operations (create, read, update, delete).
- Keeps SQL logic separate from routing.

## app/routers/
Contains FastAPI route definitions, grouped by resource.
- These define the actual HTTP endpoints exposed to the client (e.g., `/users/`).

## app/db/
Holds core database infrastructure:
- `base.py` defines the shared SQLAlchemy Base class.
- `session.py` creates the DB engine and session factory.

## app/dependencies.py
Contains dependency injection helpers, like `get_db()` and optional startup/shutdown hooks.

## app/config.py
Manages configuration via Pydantic, loading values from `.env`.
