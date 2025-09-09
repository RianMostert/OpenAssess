#!/usr/bin/env python3
"""
Database management script for development.

Usage:
    python manage_db.py init      # Initialize database with migrations
    python manage_db.py migrate   # Run pending migrations
    python manage_db.py reset     # Reset database (drop all tables and recreate)
"""

import sys
import argparse
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, MetaData

from app.core.config import settings


def init_db():
    """Initialize database with current migrations."""
    print("Initializing database...")
    
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    
    # Seed the database
    print("Seeding database...")
    from seed_db import main as seed_main
    seed_main()
    
    print("Database initialized successfully!")


def migrate():
    """Run pending migrations."""
    print("Running migrations...")
    
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("Migrations completed!")


def seed():
    """Seed the database with initial data."""
    print("Seeding database...")
    from seed_db import main as seed_main
    seed_main()
    print("Database seeding completed!")


def reset_db():
    """Reset database by dropping all tables and recreating them."""
    response = input("This will delete all data in the database. Are you sure? (y/N): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        return
    
    print("Resetting database...")
    
    engine = create_engine(settings.DATABASE_URL)
    
    # Drop all tables
    metadata = MetaData()
    metadata.reflect(bind=engine)
    metadata.drop_all(bind=engine)
    print("Dropped all tables.")
    
    # Run migrations to recreate tables
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("Database reset completed!")


def main():
    parser = argparse.ArgumentParser(description="Database management script")
    parser.add_argument(
        "command",
        choices=["init", "migrate", "reset", "seed"],
        help="Command to execute"
    )
    
    args = parser.parse_args()
    
    if args.command == "init":
        init_db()
    elif args.command == "migrate":
        migrate()
    elif args.command == "reset":
        reset_db()
    elif args.command == "seed":
        seed()


if __name__ == "__main__":
    main()
