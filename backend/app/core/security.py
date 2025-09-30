from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from uuid import UUID

from app.models.user import User

# Role ID constants
PRIMARY_ROLE_ADMINISTRATOR = 1
PRIMARY_ROLE_STAFF = 2 
PRIMARY_ROLE_STUDENT = 3

COURSE_ROLE_CONVENER = 1
COURSE_ROLE_FACILITATOR = 2
COURSE_ROLE_STUDENT = 3

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


def has_admin_access(user: User) -> bool:
    """Check if user has administrator access."""
    return user.primary_role_id == PRIMARY_ROLE_ADMINISTRATOR


def can_create_courses(user: User) -> bool:
    """Check if user can create courses. Admins and staff can create courses."""
    return user.primary_role_id in [PRIMARY_ROLE_ADMINISTRATOR, PRIMARY_ROLE_STAFF]


def get_course_role_id(user: User, course_id: UUID) -> int | None:
    """Get user's role ID in a specific course."""
    for course_role in user.course_roles:
        if str(course_role.course_id) == str(course_id):
            return course_role.course_role_id
    return None


def is_course_convener(user: User, course_id: UUID) -> bool:
    """Check if user is a convener of the course."""
    if has_admin_access(user):
        return True
    
    course_role_id = get_course_role_id(user, course_id)
    return course_role_id == COURSE_ROLE_CONVENER


def is_course_facilitator(user: User, course_id: UUID) -> bool:
    """Check if user is a facilitator in the course."""
    course_role_id = get_course_role_id(user, course_id)
    return course_role_id == COURSE_ROLE_FACILITATOR


def is_course_student(user: User, course_id: UUID) -> bool:
    """Check if user is enrolled as a student in the course."""
    course_role_id = get_course_role_id(user, course_id)
    return course_role_id == COURSE_ROLE_STUDENT


def can_manage_course(user: User, course_id: UUID) -> bool:
    """Check if user can manage course settings and membership."""
    return has_admin_access(user) or is_course_convener(user, course_id)


def can_create_assessments(user: User, course_id: UUID) -> bool:
    """Check if user can create assessments. Only conveners can create assessments."""
    return has_admin_access(user) or is_course_convener(user, course_id)


def can_manage_assessments(user: User, course_id: UUID) -> bool:
    """Check if user can modify/delete assessments. Only conveners can manage assessments."""
    return has_admin_access(user) or is_course_convener(user, course_id)


def can_grade_assessments(user: User, course_id: UUID) -> bool:
    """Check if user can grade assessments. Both conveners and facilitators can grade."""
    return (has_admin_access(user) or 
            is_course_convener(user, course_id) or 
            is_course_facilitator(user, course_id))


def can_view_course_statistics(user: User, course_id: UUID) -> bool:
    """Check if user can view course statistics. Conveners and facilitators can view stats."""
    return (has_admin_access(user) or 
            is_course_convener(user, course_id) or 
            is_course_facilitator(user, course_id))


def can_export_results(user: User, course_id: UUID) -> bool:
    """Check if user can export complete course results. Only conveners can export all results.""" 
    return has_admin_access(user) or is_course_convener(user, course_id)


def can_access_course(user: User, course_id: UUID) -> bool:
    """Check if user has any access to the course (student, facilitator, or convener)."""
    return (has_admin_access(user) or 
            get_course_role_id(user, course_id) is not None)

def is_admin_or_self(current_user: User, user_id: UUID) -> bool:
    """Check if the current user is an admin or the user themselves."""
    return current_user.is_admin or str(current_user.id) == str(user_id)
