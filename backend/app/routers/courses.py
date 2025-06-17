from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.schemas.course import CourseCreate, CourseUpdate, CourseOut
from app.models.course import Course
from app.schemas.assessment import AssessmentOut
from app.models.assessment import Assessment
from app.dependencies import get_db

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post("/", response_model=CourseOut)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    db_course = Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.get("/", response_model=List[CourseOut])
def list_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Course).offset(skip).limit(limit).all()


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: UUID, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
def update_course(course_id: UUID, update: CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}")
def delete_course(course_id: UUID, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}


@router.get("/{course_id}/assessments", response_model=List[AssessmentOut])
def list_assessments(course_id: UUID, db: Session = Depends(get_db)):
    return db.query(Assessment).filter(Assessment.course_id == course_id).all()
