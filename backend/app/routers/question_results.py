from datetime import datetime, timezone
import os
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from pathlib import Path
import shutil

from app.schemas.question_result import (
    QuestionResultCreate,
    QuestionResultUpdate,
    QuestionResultOut,
)
from app.models.question_result import QuestionResult
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.user import User
from app.dependencies import get_db, get_current_user
from app.core.config import settings
from app.core.security import can_manage_assessments

router = APIRouter(prefix="/question-results", tags=["Question Results"])

storage_path = settings.ANNOTATION_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


def validate_marker_access(db: Session, user: User, assessment_id: UUID):
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    course_id = assessment.course_id
    if not can_manage_assessments(user, course_id):
        raise HTTPException(
            status_code=403, detail="Only teachers or TAs for this course can access"
        )


@router.post("/update-mark", response_model=QuestionResultOut)
def update_mark(
    assessment_id: UUID = Form(...),
    student_id: UUID = Form(...),
    question_id: UUID = Form(...),
    mark: float = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update only the mark for a question result."""
    validate_marker_access(db, current_user, assessment_id)

    question_result = (
        db.query(QuestionResult)
        .filter_by(
            assessment_id=assessment_id,
            student_id=student_id,
            question_id=question_id,
        )
        .first()
    )

    if question_result:
        # Update existing result
        question_result.mark = mark
        question_result.updated_at = datetime.now(timezone.utc)
    else:
        # Create new result with just the mark
        question_result = QuestionResult(
            id=uuid4(),
            assessment_id=assessment_id,
            student_id=student_id,
            question_id=question_id,
            marker_id=current_user.id,
            mark=mark,
            comment="",  # Empty comment for mark-only updates
            annotation_file_path=None,
        )
    
    db.add(question_result)
    db.commit()
    db.refresh(question_result)
    return question_result


@router.post("/upload-annotation", response_model=QuestionResultOut)
def upload_annotation(
    assessment_id: UUID = Form(...),
    student_id: UUID = Form(...),
    question_id: UUID = Form(...),
    mark: float = Form(...),
    comment: str = Form(""),
    annotation_only: str = Form("false"),  # New flag to indicate annotation-only save
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_marker_access(db, current_user, assessment_id)

    question_result = (
        db.query(QuestionResult)
        .filter_by(
            assessment_id=assessment_id,
            student_id=student_id,
            question_id=question_id,
        )
        .first()
    )

    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files allowed")

    course_id = (
        db.query(Assessment.course_id).filter(Assessment.id == assessment_id).scalar()
    )
    if not course_id:
        raise HTTPException(status_code=404, detail="Course not found")

    question_result_id = question_result.id if question_result else uuid4()

    path = (
        settings.ANNOTATION_STORAGE_FOLDER
        / str(course_id)
        / str(assessment_id)
        / str(student_id)
    )
    os.makedirs(path, exist_ok=True)

    file_path = path / f"{question_result_id}.json"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if question_result:
        # Only update mark and comment if this is not an annotation-only save
        if annotation_only.lower() != "true":
            question_result.mark = mark
            question_result.comment = comment
        question_result.annotation_file_path = str(file_path)
        question_result.updated_at = datetime.now(timezone.utc)
    else:
        # Create new record - for annotation-only saves, don't set mark
        if annotation_only.lower() == "true":
            question_result = QuestionResult(
                id=question_result_id,
                assessment_id=assessment_id,
                student_id=student_id,
                question_id=question_id,
                marker_id=current_user.id,
                mark=None,  # Don't set mark for annotation-only saves
                comment="",
                annotation_file_path=str(file_path),
            )
        else:
            question_result = QuestionResult(
                id=question_result_id,
                assessment_id=assessment_id,
                student_id=student_id,
                question_id=question_id,
                marker_id=current_user.id,
                mark=mark,
                comment=comment,
                annotation_file_path=str(file_path),
            )
    db.add(question_result)

    db.commit()
    db.refresh(question_result)
    return question_result


@router.get("/", response_model=QuestionResultOut)
def get_question_result(
    assessment_id: UUID,
    question_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = (
        db.query(QuestionResult)
        .filter_by(
            assessment_id=assessment_id,
            question_id=question_id,
            student_id=student_id,
        )
        .first()
    )

    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")

    validate_marker_access(db, current_user, assessment_id)

    return result


@router.get("/{result_id}/annotation")
def download_annotation(
    result_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result or not result.annotation_file_path:
        raise HTTPException(status_code=404, detail="Annotation not found")

    validate_marker_access(db, current_user, result.assessment_id)

    file_path = Path(result.annotation_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(
        file_path, filename=file_path.name, media_type="application/json"
    )


@router.post("/", response_model=QuestionResultOut)
def create_or_update_question_result(
    result: QuestionResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_marker_access(db, current_user, result.assessment_id)

    existing = (
        db.query(QuestionResult)
        .filter(
            QuestionResult.assessment_id == result.assessment_id,
            QuestionResult.student_id == result.student_id,
            QuestionResult.question_id == result.question_id,
        )
        .first()
    )

    if existing:
        existing.mark = result.mark
        existing.comment = result.comment
        existing.annotation_file_path = result.annotation_file_path
        existing.updated_at = result.updated_at or datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    db_result = QuestionResult(**result.model_dump(), marker_id=current_user.id)
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result


@router.get("/{result_id}", response_model=QuestionResultOut)
def get_question_result_with_id(
    result_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")

    validate_marker_access(db, current_user, result.assessment_id)

    return result


@router.patch("/{result_id}", response_model=QuestionResultOut)
def update_question_result(
    result_id: UUID,
    update: QuestionResultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")

    validate_marker_access(db, current_user, result.assessment_id)

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(result, field, value)
    db.commit()
    db.refresh(result)
    return result


@router.delete("/{result_id}")
def delete_question_result(
    result_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")

    validate_marker_access(db, current_user, result.assessment_id)

    db.delete(result)
    db.commit()
    return {"message": "Question result deleted"}


@router.get("/student/{student_id}/assessment/{assessment_id}/all-results")
def get_student_all_question_results(
    student_id: UUID,
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all question results and annotations for a specific student in an assessment"""
    validate_marker_access(db, current_user, assessment_id)
    
    # Get all questions for this assessment
    questions = (
        db.query(Question)
        .filter(Question.assessment_id == assessment_id)
        .order_by(Question.question_number)
        .all()
    )
    
    # Get all question results for this student and assessment
    question_results = (
        db.query(QuestionResult)
        .filter(
            QuestionResult.assessment_id == assessment_id,
            QuestionResult.student_id == student_id
        )
        .all()
    )
    
    # Create a map of question_id -> result for easy lookup
    results_map = {qr.question_id: qr for qr in question_results}
    
    # Build response with all questions and their results/annotations
    response = {
        "student_id": str(student_id),
        "assessment_id": str(assessment_id),
        "questions": []
    }
    
    for question in questions:
        result = results_map.get(question.id)
        
        # Load annotation if it exists
        annotation_data = None
        if result and result.annotation_file_path:
            try:
                annotation_path = Path(result.annotation_file_path)
                if annotation_path.exists():
                    import json
                    with open(annotation_path, 'r') as f:
                        annotation_data = json.load(f)
            except Exception as e:
                print(f"Error loading annotation: {e}")
        
        question_data = {
            "id": str(question.id),
            "question_number": question.question_number,
            "max_marks": question.max_marks,
            "increment": question.increment,
            "memo": question.memo,
            "marking_note": question.marking_note,
            "page_number": question.page_number,
            "x": question.x,
            "y": question.y,
            "width": question.width,
            "height": question.height,
            "mark": result.mark if result else None,
            "comment": result.comment if result else None,
            "annotation": annotation_data,
            "result_id": str(result.id) if result else None,
            "updated_at": result.updated_at if result else None
        }
        response["questions"].append(question_data)
    
    return response
