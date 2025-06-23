"""
This file initializes the SQLAlchemy database engine and session factory.

- `engine` is the core database connection object that SQLAlchemy uses.
- `SessionLocal` is a sessionmaker instance used to create individual database
  sessions (one per request), which are injected into route handlers via FastAPI dependencies.

It uses the DATABASE_URL defined in the app's configuration (config.py).
Also includes special connection arguments if using SQLite for local development.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# Extra config for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Create the engine (the core DB connection)
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# SessionLocal is the class that makes DB sessions per request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
