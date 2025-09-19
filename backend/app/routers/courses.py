import csv
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
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
from app.models.role import Role
from app.schemas.user_course_role import CourseUserOut, AddFacilitatorIn
from app.dependencies import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.core.security import (
    has_course_role,
    can_create_course,
    can_manage_course_settings,
    is_course_convener,
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

    # Link the current user to the course as convener with their primary role
    user_course_role = UserCourseRole(
        user_id=current_user.id,
        course_id=db_course.id,
        role_id=current_user.primary_role_id,
        is_convener=True,  # Automatically make creator the convener
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

    if not can_manage_course_settings(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only the course convener or admin can update course settings"
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

    print(f"Deleting course with ID: {course_id} for user: {current_user.id}")

    if not is_course_convener(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only the course convener or admin can delete the course"
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

    # Get total students in the course (role name is "student")
    total_students = (
        db.query(UserCourseRole)
        .join(Role)
        .filter(UserCourseRole.course_id == course_id)
        .filter(Role.name == "student")
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


@router.get("/{course_id}/users", response_model=List[CourseUserOut])
def get_course_users(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all users enrolled in a course with their roles."""
    if not has_course_role(current_user, course_id, "teacher", "ta", "student"):
        raise HTTPException(
            status_code=403, detail="Not authorized to view course users"
        )

    course_users = (
        db.query(UserCourseRole)
        .filter(UserCourseRole.course_id == course_id)
        .all()
    )
    
    return course_users


@router.post("/{course_id}/facilitators")
def add_course_facilitator(
    course_id: UUID,
    facilitator_data: AddFacilitatorIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a facilitator (teacher/TA) to a course. Only conveners can do this."""
    if not is_course_convener(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only course conveners can add facilitators"
        )

    # Check if course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if user exists
    target_user = db.query(User).filter(User.id == facilitator_data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get role ID by name
    role = db.query(Role).filter(Role.name == facilitator_data.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if user is already enrolled in the course
    existing_role = (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == facilitator_data.user_id,
            UserCourseRole.course_id == course_id,
        )
        .first()
    )

    if existing_role:
        raise HTTPException(
            status_code=409, detail="User is already enrolled in this course"
        )

    # Add the facilitator
    user_course_role = UserCourseRole(
        user_id=facilitator_data.user_id,
        course_id=course_id,
        role_id=role.id,
        is_convener=False,  # Facilitators are not conveners
    )
    
    db.add(user_course_role)
    db.commit()
    
    return {"message": f"User added as {facilitator_data.role_name} to the course"}


@router.delete("/{course_id}/facilitators/{user_id}")
def remove_course_facilitator(
    course_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a facilitator from a course. Only conveners can do this."""
    if not is_course_convener(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only course conveners can remove facilitators"
        )

    # Find the user's role in the course
    user_course_role = (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == user_id,
            UserCourseRole.course_id == course_id,
        )
        .first()
    )

    if not user_course_role:
        raise HTTPException(
            status_code=404, detail="User not found in this course"
        )

    # Don't allow removing conveners
    if user_course_role.is_convener:
        raise HTTPException(
            status_code=403, detail="Cannot remove course convener"
        )

    db.delete(user_course_role)
    db.commit()
    
    return {"message": "User removed from course"}


@router.patch("/{course_id}/convener/{user_id}")
def transfer_course_ownership(
    course_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transfer course ownership to another user. Only current convener can do this."""
    if not is_course_convener(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only current convener can transfer ownership"
        )

    # Check if target user exists and is enrolled in the course
    target_role = (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == user_id,
            UserCourseRole.course_id == course_id,
        )
        .first()
    )

    if not target_role:
        raise HTTPException(
            status_code=404, detail="Target user not found in this course"
        )

    # Remove convener status from current user
    current_user_role = (
        db.query(UserCourseRole)
        .filter(
            UserCourseRole.user_id == current_user.id,
            UserCourseRole.course_id == course_id,
            UserCourseRole.is_convener,
        )
        .first()
    )

    if current_user_role:
        current_user_role.is_convener = False

    # Make target user the convener
    target_role.is_convener = True
    
    db.commit()
    
    return {"message": "Course ownership transferred successfully"}


@router.post("/{course_id}/facilitators/bulk-upload")
def bulk_upload_facilitators(
    course_id: UUID,
    file: UploadFile = File(...),
    role_name: str = Form("teacher"),  # Default to teacher role
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk upload facilitators from CSV. Only course conveners can do this."""
    if not is_course_convener(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only course conveners can bulk upload facilitators"
        )

    # Validate role
    if role_name not in ["teacher", "ta"]:
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'ta'")

    # Check if course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if file.content_type != "text/csv":
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Get role ID
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    contents = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(contents))

    added_facilitators = []
    skipped = []
    errors = []

    for row_num, row in enumerate(reader, 1):
        try:
            email = row.get("email", "").strip()
            if not email:
                errors.append(f"Row {row_num}: Email is required")
                continue

            # Find existing user by email
            user = db.query(User).filter(User.email == email).first()
            if not user:
                # Create new user if doesn't exist
                first_name = row.get("first_name", "").strip()
                last_name = row.get("last_name", "").strip()
                
                if not first_name or not last_name:
                    errors.append(f"Row {row_num}: First name and last name required for new user {email}")
                    continue

                from app.core.security import hash_password
                user = User(
                    id=uuid.uuid4(),
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    student_number=row.get("student_number", "").strip() or None,
                    password_hash=hash_password("*"),  # Temporary password
                    primary_role_id=role.id,  # Set primary role to the facilitator role
                    is_admin=False,
                )
                db.add(user)
                db.flush()  # Get the user ID

            # Check if user is already enrolled in the course
            existing_role = (
                db.query(UserCourseRole)
                .filter(
                    UserCourseRole.user_id == user.id,
                    UserCourseRole.course_id == course_id,
                )
                .first()
            )

            if existing_role:
                skipped.append(f"User {email} is already enrolled in this course")
                continue

            # Add user as facilitator
            user_course_role = UserCourseRole(
                user_id=user.id,
                course_id=course_id,
                role_id=role.id,
                is_convener=False,  # Facilitators are not conveners
            )
            db.add(user_course_role)
            added_facilitators.append({
                "email": email,
                "name": f"{user.first_name} {user.last_name}",
                "role": role_name
            })

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()

    return {
        "message": f"Successfully added {len(added_facilitators)} facilitators",
        "added": added_facilitators,
        "skipped": skipped,
        "errors": errors,
    }


@router.post("/{course_id}/facilitators/bulk-remove")
def bulk_remove_facilitators(
    course_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk remove facilitators from CSV. Only course conveners can do this."""
    if not is_course_convener(current_user, course_id):
        raise HTTPException(
            status_code=403, detail="Only course conveners can bulk remove facilitators"
        )

    # Check if course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if file.content_type != "text/csv":
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(contents))

    removed_facilitators = []
    not_found = []
    errors = []

    for row_num, row in enumerate(reader, 1):
        try:
            email = row.get("email", "").strip()
            if not email:
                errors.append(f"Row {row_num}: Email is required")
                continue

            # Find user by email
            user = db.query(User).filter(User.email == email).first()
            if not user:
                not_found.append(f"User with email {email} not found")
                continue

            # Find user's role in the course
            user_course_role = (
                db.query(UserCourseRole)
                .filter(
                    UserCourseRole.user_id == user.id,
                    UserCourseRole.course_id == course_id,
                )
                .first()
            )

            if not user_course_role:
                not_found.append(f"User {email} is not enrolled in this course")
                continue

            # Don't allow removing conveners
            if user_course_role.is_convener:
                errors.append(f"Cannot remove convener {email}. Transfer ownership first.")
                continue

            # Remove the user from course
            db.delete(user_course_role)
            removed_facilitators.append({
                "email": email,
                "name": f"{user.first_name} {user.last_name}"
            })

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()

    return {
        "message": f"Successfully removed {len(removed_facilitators)} facilitators",
        "removed": removed_facilitators,
        "not_found": not_found,
        "errors": errors,
    }


@router.get("/{course_id}/my-role")
def get_my_course_role(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's role in a specific course."""
    if current_user.is_admin:
        return {"role": "admin", "is_convener": True}
    
    # Find user's role in this course
    user_course_role = (
        db.query(UserCourseRole)
        .join(Role)
        .filter(
            UserCourseRole.user_id == current_user.id,
            UserCourseRole.course_id == course_id,
        )
        .first()
    )
    
    if not user_course_role:
        raise HTTPException(
            status_code=404, detail="User not enrolled in this course"
        )
    
    role_name = user_course_role.role.name
    is_convener = user_course_role.is_convener
    
    # Map roles to frontend-friendly names
    if role_name == "student":
        frontend_role = "student"
    elif is_convener:
        frontend_role = "convener"
    elif role_name in ["teacher", "ta"]:
        frontend_role = "facilitator"
    else:
        frontend_role = "student"  # Default fallback
    
    return {
        "role": frontend_role,
        "is_convener": is_convener,
        "backend_role": role_name
    }
