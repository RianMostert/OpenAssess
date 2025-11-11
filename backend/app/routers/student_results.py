from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from pathlib import Path
import tempfile
import json

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.course import Course
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.question_result import QuestionResult
from app.models.uploaded_file import UploadedFile
from app.core.config import settings
from app.utils.validators import EntityValidator, AccessValidator
from app.core.constants import PrimaryRoles

router = APIRouter(prefix="/student-results", tags=["Student Results"])


@router.get("/my-courses", response_model=List[dict])
def get_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all courses where the current user has a STUDENT role"""
    from app.core.constants import CourseRoles
    
    if current_user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
        # Admins can see all courses
        courses_with_teachers = (
            db.query(Course, User)
            .join(User, Course.teacher_id == User.id)
            .all()
        )
    else:
        # Only get courses where user has STUDENT role
        student_course_ids = [
            r.course_id for r in current_user.course_roles 
            if r.course_role_id == CourseRoles.STUDENT
        ]
        
        if not student_course_ids:
            return []
        
        courses_with_teachers = (
            db.query(Course, User)
            .join(User, Course.teacher_id == User.id)
            .filter(Course.id.in_(student_course_ids))
            .all()
        )
    
    if not courses_with_teachers:
        return []
    
    result = []
    for course, teacher in courses_with_teachers:
        user_role = next(
            (r.course_role.name for r in current_user.course_roles if r.course_id == course.id),
            None
        )
        
        result.append({
            "id": str(course.id),
            "title": course.title,
            "code": course.code,
            "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else None,
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
    # Validate course access
    AccessValidator.validate_course_access(db, current_user, course_id)
    
    # Get the user's role in this course
    user_role = next(
        (r.course_role.name for r in current_user.course_roles if r.course_id == course_id),
        None
    )
    
    # For students, only show published assessments. For teachers/TAs/admins, show all
    if user_role == "student" and current_user.primary_role_id != PrimaryRoles.ADMINISTRATOR:
        assessments = db.query(Assessment).filter(
            Assessment.course_id == course_id,
            Assessment.published
        ).all()
    else:
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
            status = "marked"
        else:
            status = "partially_marked"
        
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
    # Validate assessment exists and user has course access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_course_access(db, current_user, assessment.course_id)
    
    # Check if student can view this assessment (must be published for students)
    user_role = next(
        (r.course_role.name for r in current_user.course_roles if r.course_id == assessment.course_id),
        None
    )
    
    if user_role == "student" and not current_user.is_admin and not assessment.published:
        raise HTTPException(status_code=403, detail="Assessment results are not yet published")
    
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
        status = "marked"
    else:
        status = "partially_marked"
    
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
    # Validate assessment exists and user has course access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_course_access(db, current_user, assessment.course_id)
    
    # Check if student can view this assessment (must be published for students)
    user_role = next(
        (r.course_role.name for r in current_user.course_roles if r.course_id == assessment.course_id),
        None
    )
    
    if user_role == "student" and not current_user.is_admin and not assessment.published:
        raise HTTPException(status_code=403, detail="Assessment results are not yet published")
    
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


@router.get("/assessments/{assessment_id}/download-annotated-pdf")
def download_annotated_pdf(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download annotated PDF for a specific assessment submission"""
    # Validate assessment exists and user has course access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_course_access(db, current_user, assessment.course_id)
    
    # Check if student can view this assessment (must be published for students)
    user_role = next(
        (r.course_role.name for r in current_user.course_roles if r.course_id == assessment.course_id),
        None
    )
    
    if user_role == "student" and not current_user.is_admin and not assessment.published:
        raise HTTPException(status_code=403, detail="Assessment results are not yet published")
    
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
    
    # Check if there are any annotations for this student and assessment
    question_results_with_annotations = (
        db.query(QuestionResult)
        .filter(
            QuestionResult.assessment_id == assessment_id,
            QuestionResult.student_id == current_user.id,
            QuestionResult.annotation_file_path.isnot(None)
        )
        .all()
    )
    
    if not question_results_with_annotations:
        raise HTTPException(status_code=404, detail="No annotations available for this assessment")
    
    # Get the original PDF file path
    original_pdf_path = Path(uploaded_file.answer_sheet_file_path)
    if not original_pdf_path.exists():
        raise HTTPException(status_code=404, detail="Original answer sheet not found")
    
    # Generate annotated PDF using the same logic as the export functionality
    try:
        # Collect all annotations for this student
        annotations = []
        annotation_folder = (
            settings.ANNOTATION_STORAGE_FOLDER / 
            str(assessment.course_id) / 
            str(assessment_id) / 
            str(current_user.id)
        )
        
        if annotation_folder.exists():
            for annotation_file in annotation_folder.glob("*.json"):
                try:
                    with open(annotation_file, "r") as f:
                        data = json.load(f)
                        
                        # Try to get page number from the data, or infer from filename
                        page_number = data.get("page")
                        if page_number is None:
                            # Try to extract page number from filename
                            filename = annotation_file.stem
                            if "page_" in filename:
                                try:
                                    page_number = int(filename.split("page_")[-1])
                                except (ValueError, IndexError):
                                    page_number = 1
                            else:
                                page_number = 1
                        
                        # Convert API format to PDF service format (same as export endpoint)
                        # API uses: {color, width} -> PDF service expects: {stroke, strokeWidth}
                        converted_data = data.copy()
                        if "lines" in converted_data:
                            converted_data["lines"] = [
                                {
                                    "points": line.get("points", []),
                                    "stroke": line.get("color", "#ff0000"),
                                    "strokeWidth": line.get("width", 2),
                                    "tool": line.get("tool", "pencil"),
                                }
                                for line in converted_data["lines"]
                            ]
                        
                        # Add fontSize to texts (API doesn't send it, but PDF service needs it)
                        if "texts" in converted_data:
                            converted_data["texts"] = [
                                {
                                    **text,
                                    "fontSize": text.get("fontSize", 16),
                                }
                                for text in converted_data["texts"]
                            ]
                        
                        # Add fontSize to stickyNotes (API doesn't send it, but PDF service needs it)
                        if "stickyNotes" in converted_data:
                            converted_data["stickyNotes"] = [
                                {
                                    **sticky,
                                    "fontSize": sticky.get("fontSize", 14),
                                }
                                for sticky in converted_data["stickyNotes"]
                            ]
                        
                        annotations.append({"page": page_number, "data": converted_data})
                except Exception as e:
                    print(f"Skipping annotation file {annotation_file}: {e}")
                    continue
        
        # If no annotations, return the original PDF instead of raising an error
        if not annotations:
            return FileResponse(
                original_pdf_path,
                filename=f"{assessment.title}.pdf",
                media_type="application/pdf"
            )
        
        # Create temporary file for the annotated PDF
        temp_dir = Path(tempfile.mkdtemp())
        output_pdf_path = temp_dir / f"annotated_{assessment.title}_{current_user.student_number or current_user.id}.pdf"
        
        # Import the PDF annotation service
        from app.services.pdf_annotation_service import pdf_annotation_service
        
        # Generate the annotated PDF
        pdf_annotation_service.burn_annotations_to_pdf(str(original_pdf_path), str(output_pdf_path), annotations)
        
        # Return the file
        return FileResponse(
            output_pdf_path,
            filename=f"annotated_{assessment.title}.pdf",
            media_type="application/pdf"
        )
        
    except Exception as e:
        print(f"Error generating annotated PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate annotated PDF")
