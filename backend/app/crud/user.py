from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
import uuid
import hashlib

def create_user(db: Session, user_data: UserCreate):
    password_hash = (
        hashlib.sha256(user_data.password.encode()).hexdigest()
        if user_data.password
        else None
    )

    new_user = User(
        id=uuid.uuid4(),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        student_number=user_data.student_number,
        password_hash=password_hash,
        role=user_data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_user_by_id(db: Session, user_id: uuid.UUID):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_all_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()
