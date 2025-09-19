#!/usr/bin/env python3
"""
Database seeding script for initial data.

This script populates the database with essential initial data
like roles and default users.
"""

import sys
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import create_engine

from app.core.config import settings
from app.models.role import Role
from app.models.user import User
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_roles(db: Session) -> dict:
    """Seed initial roles into the database."""
    logger.info("Seeding roles...")
    
    # Define default roles
    default_roles = [
        {"id": 1, "name": "teacher"},   # Teachers can create courses
        {"id": 2, "name": "ta"},        # TAs assist teachers  
        {"id": 3, "name": "student"},   # Students take courses
        {"id": 4, "name": "admin"},     # System admins
    ]
    
    role_map = {}
    
    for role_data in default_roles:
        # Check if role already exists
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        
        if not existing_role:
            role = Role(id=role_data["id"], name=role_data["name"])
            db.add(role)
            role_map[role_data["name"]] = role_data["id"]
            logger.info(f"Created role: {role_data['name']}")
        else:
            role_map[existing_role.name] = existing_role.id
            logger.info(f"Role already exists: {existing_role.name}")
    
    db.commit()
    return role_map


def seed_admin_user(db: Session, role_map: dict) -> None:
    """Seed an initial admin user."""
    logger.info("Seeding admin user...")
    
    admin_email = "admin@example.com"
    
    # Check if admin user already exists
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    
    if not existing_admin:
        admin_user = User(
            first_name="Admin",
            last_name="User",
            email=admin_email,
            student_number=None,  # Admin doesn't need a student number
            password_hash=hash_password("admin123"),  # Change this in production!
            is_admin=True,
            primary_role_id=role_map["admin"]
        )
        
        db.add(admin_user)
        db.commit()
        logger.info(f"Created admin user: {admin_email}")
        logger.warning("Default admin password is 'admin123' - CHANGE THIS IN PRODUCTION!")
    else:
        logger.info("Admin user already exists")


def main():
    """Main seeding function."""
    logger.info("Starting database seeding...")
    
    try:
        # Create database engine and session
        engine = create_engine(settings.DATABASE_URL)
        
        with Session(engine) as db:
            # Seed roles
            role_map = seed_roles(db)
            
            # Seed admin user
            seed_admin_user(db, role_map)
            
        logger.info("Database seeding completed successfully!")
        
    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        raise


if __name__ == "__main__":
    main()
