import csv
import io
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.crud.user import (
    create_user,
    get_user_by_id,
    get_user_by_email,
    get_all_users,
    update_user,
    delete_user,
)
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.user_course_role import UserCourseRole
from app.core.security import hash_password, is_admin_or_self

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/", response_model=UserOut)
def create_user_endpoint(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can create users")

    db_user = create_user(db, user)
    return db_user


@router.post("/bulk-upload", response_model=list[UserOut])
def bulk_upload_users(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    role_id: int = Form(3),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type != "text/csv":
        raise HTTPException(status_code=400, detail="Invalid file type")

    contents = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(contents))

    created_users = []

    for row in reader:
        email = row.get("email")
        if not email:
            continue

        existing_user = db.query(User).filter_by(email=email).first()
        if existing_user:
            continue

        new_user = User(
            id=uuid.uuid4(),
            first_name=row.get("first_name", "").strip(),
            last_name=row.get("last_name", "").strip(),
            email=email.strip(),
            student_number=row.get("student_number", "").strip() or None,
            password_hash=hash_password("*"),  # use * as default temp password
            primary_role_id=3,
        )
        db.add(new_user)
        db.flush()

        user_course_link = UserCourseRole(
            user_id=new_user.id, course_id=course_id, role_id=role_id
        )
        db.add(user_course_link)

        created_users.append(new_user)

    db.commit()
    return created_users


@router.get("/", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    email: str | None = None,
    course_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can list users")

    if email:
        db_user = get_user_by_email(db, email)
        if db_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return [db_user]

    users = get_all_users(db, skip=skip, limit=limit)

    if course_id:
        for user in users:
            user.course_roles = [
                role for role in user.course_roles if role.course_id == course_id
            ]
    return users


@router.get("/{user_id}", response_model=UserOut)
def read_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_or_self(current_user, user_id):
        raise HTTPException(status_code=403, detail="Not authorized to view this user")

    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.patch("/{user_id}", response_model=UserOut)
def update_user_endpoint(
    user_id: UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_or_self(current_user, user_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this user"
        )

    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return update_user(db, db_user, user_update)


@router.delete("/{user_id}", response_model=UserOut)
def delete_user_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    db_user = delete_user(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
