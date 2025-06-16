from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.crud.user import (
    create_user,
    get_user_by_id,
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


@router.get("/", response_model=List[UserOut])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
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
