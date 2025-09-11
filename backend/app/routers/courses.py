from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import List

from app.schemas.course import CourseCreate, CourseUpdate, CourseOut
from app.models.course import Course
from app.schemas.assessment import AssessmentOut
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.question_result import QuestionResult
from app.models.uploaded_file import UploadedFile
from app.models.user_course_role import UserCourseRole
from app.dependencies import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.core.security import (
    has_course_role,
    is_course_teacher,
    can_create_course,
)


router = APIRouter(prefix="/courses", tags=["Courses"])

@router.post("/", response_model=CourseOut)
def create_course(
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


@router.get("/{course_id}/stats")
def get_course_stats(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not has_course_role(current_user, course_id, "student", "ta", "teacher"):
        raise HTTPException(
            status_code=403, detail="Not authorized to view course stats"
        )

    # Get total students in the course (role_id 3 is student)
    total_students = (
        db.query(UserCourseRole)
        .filter(UserCourseRole.course_id == course_id)
        .filter(UserCourseRole.role_id == 3)
        .count()
    )

    # Get all assessments for the course
    assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
    
    assessment_stats = []
    total_scores = []
    
    for assessment in assessments:
        # Get total questions for this assessment
        total_questions = (
            db.query(Question)
            .filter(Question.assessment_id == assessment.id)
            .count()
        )
        
        # Get submission count (unique students who have uploaded files)
        submission_count = (
            db.query(UploadedFile.student_id)
            .filter(UploadedFile.assessment_id == assessment.id)
            .distinct()
            .count()
        )
        
        # Get questions marked (any question result exists)
        questions_marked = (
            db.query(QuestionResult)
            .filter(QuestionResult.assessment_id == assessment.id)
            .filter(QuestionResult.mark.isnot(None))
            .count()
        )
        
        # Get questions completely marked (all students have results for a question)
        if submission_count > 0:
            questions_completely_marked = (
                db.query(QuestionResult.question_id)
                .filter(QuestionResult.assessment_id == assessment.id)
                .filter(QuestionResult.mark.isnot(None))
                .group_by(QuestionResult.question_id)
                .having(func.count(QuestionResult.student_id) == submission_count)
                .count()
            )
        else:
            questions_completely_marked = 0
        
        # Calculate average score for this assessment
        avg_score_result = (
            db.query(func.avg(QuestionResult.mark))
            .filter(QuestionResult.assessment_id == assessment.id)
            .filter(QuestionResult.mark.isnot(None))
            .scalar()
        )
        
        avg_score = float(avg_score_result) if avg_score_result else 0.0
        
        # Calculate total possible marks for this assessment
        total_possible = (
            db.query(func.sum(Question.max_marks))
            .filter(Question.assessment_id == assessment.id)
            .scalar()
        ) or 0
        
        # Convert to percentage if we have total possible marks
        avg_percentage = (avg_score / total_possible * 100) if total_possible > 0 else 0
        
        # Collect individual student scores for overall average calculation
        if avg_score > 0:
            total_scores.append(avg_percentage)
        
        assessment_stats.append({
            "id": str(assessment.id),
            "title": assessment.title,
            "published": assessment.published,
            "totalQuestions": total_questions,
            "totalStudents": total_students,
            "questionsMarked": questions_marked,
            "questionsCompletelyMarked": questions_completely_marked,
            "averageScore": avg_percentage,
            "submissionCount": submission_count,
        })
    
    # Calculate overall average performance across all assessments
    average_performance = sum(total_scores) / len(total_scores) if total_scores else 0.0
    
    return {
        "totalStudents": total_students,
        "averagePerformance": average_performance,
        "assessments": assessment_stats,
    }
