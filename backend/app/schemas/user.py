from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr = None
    student_number: Optional[str] = None
    password: Optional[str] = None  # plaintext input
    role: str

class UserOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    student_number: Optional[str]
    role: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True