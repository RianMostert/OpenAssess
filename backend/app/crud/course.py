from sqlalchemy.orm import Session
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate
from uuid import UUID


def create_course(db: Session, course_data: CourseCreate):
    new_course = Course(**course_data.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course


def get_course_by_id(db: Session, course_id: UUID):
    return db.query(Course).filter(Course.id == course_id).first()


def get_course_by_code(db: Session, code: str):
    return db.query(Course).filter(Course.code == code).first()


def get_all_courses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Course).offset(skip).limit(limit).all()


def update_course(db: Session, course: Course, course_update: CourseUpdate):
    for key, value in course_update.model_dump(exclude_unset=True).items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: UUID):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course:
        db.delete(course)
        db.commit()
    return course
