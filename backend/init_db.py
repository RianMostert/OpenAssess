#!/usr/bin/env python3
"""
Database initialization script for the application.

This script handles database migrations and can be used in Docker containers
to ensure the database is properly set up before the application starts.
"""

import sys
import time
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def wait_for_db(max_retries: int = 30, retry_interval: int = 2) -> bool:
    """
    Wait for the database to be available.
    
    Args:
        max_retries: Maximum number of connection attempts
        retry_interval: Seconds to wait between attempts
        
    Returns:
        True if database is available, False otherwise
    """
    logger.info(f"Waiting for database at {settings.DATABASE_URL}")
    
    for attempt in range(max_retries):
        try:
            engine = create_engine(settings.DATABASE_URL)
            with engine.connect() as conn:
                # Try a simple query
                conn.execute(text("SELECT 1"))
            logger.info("Database is available!")
            return True
            
        except OperationalError as e:
            logger.warning(f"Database not ready (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_interval)
            
    logger.error("Database is not available after maximum retries")
    return False


def run_migrations():
    """Run Alembic migrations."""
    logger.info("Running database migrations...")
    
    try:
        # Create Alembic configuration
        alembic_cfg = Config("alembic.ini")
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully!")
        
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        raise


def seed_database():
    """Seed the database with initial data."""
    logger.info("Seeding database with initial data...")
    
    try:
        # Import and run the seeding script
        from seed_db import main as seed_main
        seed_main()
        logger.info("Database seeding completed successfully!")
        
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        raise


def main():
    """Main initialization function."""
    logger.info("Starting database initialization...")
    
    # Wait for database to be available
    if not wait_for_db():
        logger.error("Database is not available. Exiting.")
        sys.exit(1)
    
    # Run migrations
    try:
        run_migrations()
        
        # Seed the database with initial data
        seed_database()
        
        logger.info("Database initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
