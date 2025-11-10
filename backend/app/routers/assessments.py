import shutil
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from pathlib import Path

from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentOut
from app.models.assessment import Assessment
from app.schemas.question import QuestionOut
from app.models.question import Question
from app.models.uploaded_file import UploadedFile
from app.schemas.uploaded_file import UploadedFileOut
from app.models.user import User
from app.dependencies import get_current_user
from app.core.security import can_create_assessments

from app.dependencies import get_db
from app.core.config import settings
from app.utils.validators import EntityValidator, AccessValidator, FileValidator
from app.services.file_storage_service import file_storage_service
from app.services.assessment_service import assessment_service
from app.services.export_service import csv_export_service

router = APIRouter(prefix="/assessments", tags=["Assessments"])

storage_path = settings.QUESTION_PAPER_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


@router.post("/upload/question-paper", response_model=dict)
def upload_question_paper(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    assessment_id: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    FileValidator.validate_pdf_file(file.filename)
    
    # Save file using service
    file_path = file_storage_service.save_question_paper(
        file, UUID(course_id), UUID(assessment_id)
    )
    
    return {"file_path": str(file_path)}


@router.post("/upload", response_model=AssessmentOut)
def upload_assessment(
    title: str = Form(...),
    course_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not can_create_assessments(current_user, course_id):
        raise HTTPException(status_code=403, detail="Not authorized to create assessments")

    file_id = uuid4()
    filename = f"{file_id}_{file.filename}"
    file_path = storage_path / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_assessment = Assessment(
        id=file_id,
        title=title,
        course_id=course_id,
        question_paper_file_path=str(file_path),
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


@router.get("/{assessment_id}/questions", response_model=list[QuestionOut])
def get_assessment_questions(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_assessment_access(db, current_user, assessment)
    
    questions = db.query(Question).filter(Question.assessment_id == assessment.id).all()
    return questions


@router.get("/{assessment_id}/question-paper")
def download_question_paper(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_assessment_access(db, current_user, assessment)
    
    if not assessment.question_paper_file_path:
        raise HTTPException(status_code=404, detail="Question paper not found")

    file_path = Path(assessment.question_paper_file_path)
    print(f"Serving question paper: {file_path} (exists: {file_path.exists()})")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(
        file_path, filename=file_path.name, media_type="application/pdf"
    )


@router.get("/{assessment_id}/answer-sheets", response_model=List[UploadedFileOut])
def list_student_answer_sheets(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not (current_user.is_admin or assessment.course.teacher_id == current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    files = (
        db.query(UploadedFile, User)
        .join(User, UploadedFile.student_id == User.id)
        .filter(UploadedFile.assessment_id == assessment_id)
        .order_by(UploadedFile.uploaded_at)
        .all()
    )

    results = []
    for uploaded_file, user in files:
        results.append(
            UploadedFileOut(
                **uploaded_file.__dict__,
                student_name=user.first_name + " " + user.last_name,
                student_number=user.student_number,
            )
        )
    return results


@router.get("/{assessment_id}/results/download", response_class=StreamingResponse)
def download_assessment_results_csv(
    assessment_id: UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_assessment_access(db, current_user, assessment)
    
    try:
        # Generate CSV using service
        output = csv_export_service.export_assessment_results(db, assessment_id)
        
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=assessment_{assessment_id}_results.csv"
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/", response_model=AssessmentOut)
def create_assessment(
    assessment: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not can_create_assessments(current_user, assessment.course_id):
        raise HTTPException(
            status_code=403, detail="Only course conveners can create assessments"
        )

    db_assessment = Assessment(**assessment.model_dump())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


@router.get("/", response_model=list[AssessmentOut])
def get_assessments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        return db.query(Assessment).offset(skip).limit(limit).all()

    course_ids = [r.course_id for r in current_user.course_roles]
    return (
        db.query(Assessment)
        .filter(Assessment.course_id.in_(course_ids))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_assessment_access(db, current_user, assessment)
    
    return assessment


@router.patch("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: UUID,
    update: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

    # Clean up old question paper file if a new one is being set
    update_data = update.model_dump(exclude_unset=True)
    if "question_paper_file_path" in update_data and update_data["question_paper_file_path"]:
        old_file_path = assessment.question_paper_file_path
        if old_file_path and old_file_path != update_data["question_paper_file_path"]:
            try:
                old_path = Path(old_file_path)
                if old_path.exists():
                    old_path.unlink()  # Delete the old file
                    print(f"Deleted old question paper: {old_file_path}")
            except Exception as e:
                print(f"Failed to delete old question paper {old_file_path}: {e}")

    for field, value in update_data.items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.patch("/{assessment_id}/publish", response_model=AssessmentOut)
def toggle_assessment_publication(
    assessment_id: UUID,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish or unpublish an assessment (makes results visible/invisible to students)"""
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

    publish = request.get("published", False)
    assessment.published = publish
    db.commit()
    db.refresh(assessment)
    
    return assessment


@router.delete("/{assessment_id}")
def delete_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted"}


@router.get("/{assessment_id}/stats")
def get_assessment_stats(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive statistics for an assessment"""
    # Validate assessment exists and user has access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_assessment_access(db, current_user, assessment)
    
    # Get stats from service
    return assessment_service.get_assessment_with_stats(db, assessment_id)
