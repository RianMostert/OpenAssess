from fastapi import APIRouter, Depends, HTTPException
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
from app.dependencies import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserOut)
def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    db_user = create_user(db, user)
    return db_user


@router.get("/{user_id}", response_model=UserOut)
def read_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Example of a protected route to get current user info, will use later when doing authentication
# @router.get("/me", response_model=UserOut)
# def get_current_user_info(current_user: User = Depends(get_current_user)):
#     return current_user


# If email is provided, return user by email, otherwise return all users
@router.get("/", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    email: str | None = None,
    db: Session = Depends(get_db),
):
    if email:
        db_user = get_user_by_email(db, email)
        if db_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return [db_user]
    return get_all_users(db, skip=skip, limit=limit)


@router.patch("/{user_id}", response_model=UserOut)
def update_user_endpoint(
    user_id: UUID, user_update: UserUpdate, db: Session = Depends(get_db)
):
    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return update_user(db, db_user, user_update)


@router.delete("/{user_id}", response_model=UserOut)
def delete_user_endpoint(user_id: UUID, db: Session = Depends(get_db)):
    db_user = delete_user(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
