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

from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentOut
from app.models.assessment import Assessment
from app.schemas.question import QuestionOut
from app.models.question import Question
from app.models.user import User
from app.dependencies import get_current_user
from app.core.security import has_course_role


from app.dependencies import get_db
from app.core.config import settings

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
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # if not has_course_role(current_user, course_id, "teacher", "ta"):
    #     raise HTTPException(status_code=403, detail="Not authorized to upload")

    destination_dir = storage_path / course_id / assessment_id
    os.makedirs(destination_dir, exist_ok=True)

    file_path = destination_dir / f"{uuid4()}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"file_path": str(file_path)}


@router.post("/upload", response_model=AssessmentOut)
def upload_assessment(
    title: str = Form(...),
    course_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not has_course_role(current_user, course_id, "teacher", "ta"):
        raise HTTPException(status_code=403, detail="Not authorized to upload")

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
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(
        current_user, assessment.course_id, "student", "ta", "teacher"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to view questions")

    questions = db.query(Question).filter(Question.assessment_id == assessment.id).all()
    # if not questions:
    #     raise HTTPException(status_code=404, detail="No questions found")
    return questions


@router.get("/{assessment_id}/question-paper")
def download_question_paper(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment or not assessment.question_paper_file_path:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if not has_course_role(
        current_user, assessment.course_id, "student", "ta", "teacher"
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to view this question paper"
        )

    file_path = Path(assessment.question_paper_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(
        file_path, filename=file_path.name, media_type="application/pdf"
    )


@router.post("/", response_model=AssessmentOut)
def create_assessment(
    assessment: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("Creating assessment:", assessment.model_dump())
    if not has_course_role(current_user, assessment.course_id, "teacher", "ta"):
        raise HTTPException(
            status_code=403, detail="Not authorized to create assessment"
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
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(
        current_user, assessment.course_id, "student", "ta", "teacher"
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to view this assessment"
        )

    return assessment


@router.patch("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: UUID,
    update: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(current_user, assessment.course_id, "teacher", "ta"):
        raise HTTPException(status_code=403, detail="Not authorized to update")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{assessment_id}")
def delete_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not (current_user.is_admin or assessment.course.teacher_id == current_user.id):
        raise HTTPException(
            status_code=403, detail="Only course teacher or admin can delete"
        )

    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted"}
