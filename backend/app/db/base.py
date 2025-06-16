"""
This file defines the shared SQLAlchemy Base class that all models inherit from.
It enables SQLAlchemy to track table definitions and create database tables.

Every model (e.g., User, Course) should inherit from `Base` so that it can be
registered with SQLAlchemy's metadata system and included when calling
`Base.metadata.create_all(bind=engine)`.
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()