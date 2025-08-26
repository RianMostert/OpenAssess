from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.session import get_db
from app.crud.user import get_user_by_email
from app.schemas.user import UserCreate, UserOut
from app.crud.user import create_user
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "primary_role_id": user.primary_role_id
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/signup", response_model=UserOut)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, user_data.email)
    
    if existing_user:
        # Check if the existing user has the default password "*"
        if verify_password("*", existing_user.password_hash):
            # User exists with default password, allow them to set their password
            existing_user.password_hash = hash_password(user_data.password)
            
            # Update other fields if they were provided during bulk upload but are empty
            if user_data.first_name and not existing_user.first_name:
                existing_user.first_name = user_data.first_name
            if user_data.last_name and not existing_user.last_name:
                existing_user.last_name = user_data.last_name
            if user_data.student_number and not existing_user.student_number:
                existing_user.student_number = user_data.student_number
                
            db.commit()
            db.refresh(existing_user)
            return existing_user
        else:
            # User exists with a real password
            raise HTTPException(
                status_code=400, 
                detail="Email already registered with an active account. Please use the login page."
            )

    # User doesn't exist, create new user (original behavior)
    return create_user(db, user_data)
