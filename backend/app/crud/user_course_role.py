from sqlalchemy.orm import Session
from app.models.user_course_role import UserCourseRole
from app.models.course_role import CourseRole
from app.models.course import Course
from app.models.user import User
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException


def assign_role_to_user(db: Session, user_id, course_id, role_name: str):
    role = db.query(CourseRole).filter(CourseRole.name == role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Course role '{role_name}' not found.")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user_course_role = UserCourseRole(
        user_id=user_id, course_id=course_id, course_role_id=role.id
    )

    db.add(user_course_role)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="User already has this role in this course."
        )

    db.refresh(user_course_role)
    return user_course_role


def get_user_roles_in_course(db: Session, user_id, course_id):
    return (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == user_id, UserCourseRole.course_id == course_id
        )
        .all()
    )


def remove_user_role(db: Session, user_id, course_id, role_name: str):
    role = db.query(CourseRole).filter(CourseRole.name == role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Course role '{role_name}' not found.")

    entry = (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == user_id,
            UserCourseRole.course_id == course_id,
            UserCourseRole.course_role_id == role.id,
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404, detail="User does not have this role in this course."
        )

    db.delete(entry)
    db.commit()
    return {"detail": "Role removed successfully"}
