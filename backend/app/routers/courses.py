from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.schemas.course import CourseCreate, CourseUpdate, CourseOut
from app.models.course import Course
from app.schemas.assessment import AssessmentOut
from app.models.assessment import Assessment
from app.dependencies import get_db
from app.models.user import User
from app.models.user_course_role import UserCourseRole
from app.dependencies import get_current_user
from app.core.security import (
    has_course_role,
    is_course_teacher,
    can_create_course,
)


router = APIRouter(prefix="/courses", tags=["Courses"])


# @router.post("/", response_model=CourseOut)
# async def create_course_debug(
#     request: Request,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     body = await request.body()
#     print("Raw request body:", body.decode())

#     # Try parsing manually to test
#     try:
#         data = await request.json()
#         print("Parsed JSON:", data)
#     except Exception as e:
#         print("JSON parse error:", e)

#     raise HTTPException(status_code=418, detail="Debug mode")


@router.post("/", response_model=CourseOut)
async def create_course(
    course: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not can_create_course(current_user):
        raise HTTPException(
            status_code=403, detail="Only teachers or admins can create courses"
        )

    # Create the course
    db_course = Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)

    # Link the current user to the course via their primary role
    user_course_role = UserCourseRole(
        user_id=current_user.id,
        course_id=db_course.id,
        role_id=current_user.primary_role_id,
    )
    db.add(user_course_role)
    db.commit()

    return db_course


@router.get("/my-course-ids", response_model=List[UUID])
def get_my_course_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrolled_ids = [r.course_id for r in current_user.course_roles if r.course_id]
    if not enrolled_ids:
        raise HTTPException(status_code=404, detail="No enrolled courses found")
    return enrolled_ids


@router.get("/", response_model=List[CourseOut])
def get_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        return db.query(Course).offset(skip).limit(limit).all()

    enrolled_ids = [r.course_id for r in current_user.course_roles]
    return (
        db.query(Course)
        .filter(Course.id.in_(enrolled_ids))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{course_id}", response_model=CourseOut)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not has_course_role(current_user, course_id, "student", "ta", "teacher"):
        raise HTTPException(
            status_code=403,
            detail="Only enrolled users can view course details",
        )

    return course


@router.patch("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: UUID,
    update: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not (current_user.is_admin or course.teacher_id == current_user.id):
        raise HTTPException(
            status_code=403, detail="Only the course teacher or admin can update"
        )

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}")
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    print(f"Deleting course with ID: {course_id} for teacher: {current_user.id}")

    if not is_course_teacher(current_user, course.id):
        raise HTTPException(
            status_code=403, detail="Only the course teacher or admin can delete"
        )

    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}


@router.get("/{course_id}/assessments", response_model=List[AssessmentOut])
def get_course_assessments(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not has_course_role(current_user, course_id, "student", "ta", "teacher"):
        raise HTTPException(
            status_code=403, detail="Not authorized to view assessments"
        )

    assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
    # if not assessments:
    #     raise HTTPException(
    #         status_code=404, detail="No assessments found for this course"
    #     )
    return assessments
