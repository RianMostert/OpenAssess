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
from app.models.user import User
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_roles(db: Session) -> dict:
    """Seed initial roles into the database."""
    logger.info("Seeding roles...")
    
    # This function is kept for backward compatibility
    logger.info("Primary roles and course roles are seeded via database migration")
    
    # Return the role mapping for our current structure
    role_map = {
        "administrator": 1,
        "staff": 2, 
        "student": 3
    }
    
    return role_map


def seed_users(db: Session) -> None:
    """Seed test users with the new role system."""
    logger.info("Seeding test users...")
    
    test_users = [
        # 1 Administrator
        {
            "first_name": "Admin",
            "last_name": "User", 
            "email": "admin@example.com",
            "primary_role_id": 1,  # Administrator
            "password": "admin123",
            "is_admin": True,
        },
        # 2 Staff members
        {
            "first_name": "John",
            "last_name": "Smith",
            "email": "john.smith@example.com", 
            "student_number": "12345676",
            "primary_role_id": 2,  # Staff
            "password": "staff123",
            "is_admin": False,
        },
        {
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": "sarah.johnson@example.com", 
            "student_number": "12345677",
            "primary_role_id": 2,  # Staff
            "password": "staff123",
            "is_admin": False,
        },
        # 3 Students
        {
            "first_name": "Alice",
            "last_name": "Brown",
            "email": "alice.brown@example.com",
            "student_number": "12345678",
            "primary_role_id": 3,  # Student
            "password": "student123", 
            "is_admin": False,
        },
        {
            "first_name": "Bob",
            "last_name": "Wilson",
            "email": "bob.wilson@example.com",
            "student_number": "12345679",
            "primary_role_id": 3,  # Student
            "password": "student123", 
            "is_admin": False,
        },
        {
            "first_name": "Carol",
            "last_name": "Davis",
            "email": "carol.davis@example.com",
            "student_number": "12345680",
            "primary_role_id": 3,  # Student
            "password": "student123", 
            "is_admin": False,
        }
    ]
    
    for user_data in test_users:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        
        if not existing_user:
            user = User(
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                email=user_data["email"],
                student_number=user_data.get("student_number"),
                password_hash=hash_password(user_data["password"]),
                is_admin=user_data["is_admin"],
                primary_role_id=user_data["primary_role_id"]
            )
            
            db.add(user)
            role_names = {1: "Administrator", 2: "Staff", 3: "Student"}
            logger.info(f"Created user: {user_data['email']} ({role_names[user_data['primary_role_id']]})")
        else:
            logger.info(f"User already exists: {existing_user.email}")
    
    db.commit()
    logger.info("Test user seeding completed!")


def main():
    """Main seeding function."""
    logger.info("Starting database seeding...")
    
    try:
        # Create database engine and session
        engine = create_engine(settings.DATABASE_URL)
        
        with Session(engine) as db:
            # Seed roles
            seed_roles(db)
            
            # Seed users with new role system
            seed_users(db)
            
        logger.info("Database seeding completed successfully!")
        logger.warning("Default passwords: admin123, staff123, student123 - CHANGE THESE IN PRODUCTION!")
        
    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        raise


if __name__ == "__main__":
    main()
