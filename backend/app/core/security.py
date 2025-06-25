from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from uuid import UUID

from app.models.user import User

# Token config
SECRET_KEY = "super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(
    schemes=["bcrypt"], deprecated="auto", default="bcrypt", truncate_error=True
)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def is_admin_or_self(user: User, target_user_id: UUID) -> bool:
    return user.is_admin or user.id == target_user_id


def has_course_role(user: User, course_id: UUID, *roles: str) -> bool:
    return user.is_admin or any(
        r.course_id == course_id and r.role.name in roles for r in user.course_roles
    )


def is_course_teacher(user: User, course_id: UUID) -> bool:
    return has_course_role(user, course_id, "teacher")


def is_course_teacher_or_ta(user: User, course_id: UUID) -> bool:
    return has_course_role(user, course_id, "teacher", "ta")


def can_create_course(user: User) -> bool:
    return user.is_admin or any(r.role.name == "teacher" for r in user.course_roles)
