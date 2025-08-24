from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.course import Course
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.question_result import QuestionResult
from app.models.uploaded_file import UploadedFile
from app.core.security import has_course_role

router = APIRouter(prefix="/student-results", tags=["Student Results"])


@router.get("/my-courses", response_model=List[dict])
def get_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all courses the current student is enrolled in"""
    if current_user.is_admin:
        courses = db.query(Course).all()
    else:
        course_ids = [r.course_id for r in current_user.course_roles]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
    
    if not courses:
        return []
    
    result = []
    for course in courses:
        user_role = next(
            (r.role.name for r in current_user.course_roles if r.course_id == course.id),
            None
        )
        
        result.append({
            "id": str(course.id),
            "title": course.title,
            "code": course.code,
            "teacher_name": f"{course.teacher.first_name} {course.teacher.last_name}" if course.teacher else None,
            "my_role": user_role,
            "created_at": course.created_at
        })
    
    return result


@router.get("/courses/{course_id}/my-assessments", response_model=List[dict])
def get_my_course_assessments(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all assessments for a course with the student's status and results"""
    if not has_course_role(current_user, course_id, "student", "ta", "teacher") and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this course")
    
    assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
    
    if not assessments:
        return []
    
    result = []
    for assessment in assessments:
        uploaded_file = (
            db.query(UploadedFile)
            .filter(
                UploadedFile.assessment_id == assessment.id,
                UploadedFile.student_id == current_user.id
            )
            .first()
        )
        
        question_results = (
            db.query(QuestionResult)
            .filter(
                QuestionResult.assessment_id == assessment.id,
                QuestionResult.student_id == current_user.id
            )
            .all()
        )
        
        total_possible_marks = (
            db.query(func.sum(Question.max_marks))
            .filter(Question.assessment_id == assessment.id)
            .scalar() or 0
        )
        
        total_marks = sum(qr.mark for qr in question_results if qr.mark is not None)
        
        has_results = len(question_results) > 0
        all_questions_marked = (
            db.query(Question)
            .filter(Question.assessment_id == assessment.id)
            .count()
        ) == len(question_results) if question_results else False
        
        if not uploaded_file:
            status = "not_submitted"
        elif not has_results:
            status = "submitted_pending"
        elif all_questions_marked:
            status = "graded"
        else:
            status = "partially_graded"
        
        result.append({
            "assessment_id": str(assessment.id),
            "title": assessment.title,
            "upload_date": assessment.upload_date,
            "status": status,
            "total_marks": total_marks if has_results else None,
            "total_possible_marks": total_possible_marks,
            "percentage": round((total_marks / total_possible_marks) * 100, 1) if total_possible_marks > 0 and has_results else None,
            "uploaded_file_id": str(uploaded_file.id) if uploaded_file else None,
            "question_count": len(question_results),
            "has_annotated_pdf": any(qr.annotation_file_path for qr in question_results)
        })
    
    return result


@router.get("/assessments/{assessment_id}/my-results", response_model=dict)
def get_my_assessment_results(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed results for a specific assessment for the current student"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if not has_course_role(current_user, assessment.course_id, "student", "ta", "teacher") and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this assessment")
    
    uploaded_file = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.assessment_id == assessment_id,
            UploadedFile.student_id == current_user.id
        )
        .first()
    )
    
    questions = (
        db.query(Question)
        .filter(Question.assessment_id == assessment_id)
        .order_by(Question.question_number)
        .all()
    )
    
    question_results = (
        db.query(QuestionResult)
        .filter(
            QuestionResult.assessment_id == assessment_id,
            QuestionResult.student_id == current_user.id
        )
        .all()
    )
    
    results_map = {qr.question_id: qr for qr in question_results}
    
    detailed_questions = []
    total_marks = 0
    total_possible_marks = 0
    
    for question in questions:
        result = results_map.get(question.id)
        question_mark = result.mark if result and result.mark is not None else None
        
        if question_mark is not None:
            total_marks += question_mark
        if question.max_marks:
            total_possible_marks += question.max_marks
        
        detailed_questions.append({
            "question_id": str(question.id),
            "question_number": question.question_number,
            "max_marks": question.max_marks,
            "mark": question_mark,
            "comment": result.comment if result else None,
            "marker_name": f"{result.marker.first_name} {result.marker.last_name}" if result and result.marker else None,
            "has_annotation": bool(result and result.annotation_file_path),
            "updated_at": result.updated_at if result else None
        })
    
    if not uploaded_file:
        status = "not_submitted"
    elif len(question_results) == 0:
        status = "submitted_pending"
    elif len(question_results) == len(questions):
        status = "fully_graded"
    else:
        status = "partially_graded"
    
    return {
        "assessment": {
            "id": str(assessment.id),
            "title": assessment.title,
            "course_title": assessment.course.title,
            "upload_date": assessment.upload_date
        },
        "status": status,
        "uploaded_file_id": str(uploaded_file.id) if uploaded_file else None,
        "total_marks": total_marks if question_results else None,
        "total_possible_marks": total_possible_marks,
        "percentage": round((total_marks / total_possible_marks) * 100, 1) if total_possible_marks > 0 and question_results else None,
        "questions": detailed_questions,
        "grading_completed": len(question_results) == len(questions) if questions else False
    }


@router.get("/assessments/{assessment_id}/annotated-pdf")
def get_annotated_pdf_download_info(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get information about annotated PDF availability for download"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if not has_course_role(current_user, assessment.course_id, "student", "ta", "teacher") and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this assessment")
    
    uploaded_file = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.assessment_id == assessment_id,
            UploadedFile.student_id == current_user.id
        )
        .first()
    )
    
    if not uploaded_file:
        raise HTTPException(status_code=404, detail="No submission found for this assessment")
    
    has_annotations = (
        db.query(QuestionResult)
        .filter(
            QuestionResult.assessment_id == assessment_id,
            QuestionResult.student_id == current_user.id,
            QuestionResult.annotation_file_path.isnot(None)
        )
        .count() > 0
    )
    
    return {
        "uploaded_file_id": str(uploaded_file.id),
        "has_annotations": has_annotations,
        "download_available": has_annotations,
        "message": "Annotated PDF available for download" if has_annotations else "No annotations available yet"
    }
