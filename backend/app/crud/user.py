from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.models.role import Role
from app.models.user_course_role import UserCourseRole
import uuid


def create_user(db: Session, user_data: UserCreate):
    password_hash = hash_password(user_data.password) if user_data.password else None

    new_user = User(
        id=uuid.uuid4(),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        student_number=user_data.student_number,
        password_hash=password_hash,
        is_admin=user_data.is_admin if hasattr(user_data, "is_admin") else False,
        primary_role_id=user_data.primary_role_id,
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


def update_user(db: Session, user: User, user_update: UserUpdate):
    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data["password"])
        del update_data["password"]

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: uuid.UUID):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return user


def create_user_with_default_role(db: Session, user_data: UserCreate):
    user = create_user(db, user_data)

    student_role = db.query(Role).filter(Role.name == "student").first()
    if student_role:
        user_course_role = UserCourseRole(
            user_id=user.id,
            course_id=None,
            role_id=student_role.id,
        )
        db.add(user_course_role)
        db.commit()
        db.refresh(user)
    return user
