from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
import shutil

from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentOut
from app.models.assessment import Assessment
from app.schemas.question import QuestionOut
from app.models.question import Question

from app.dependencies import get_db
from app.config import settings

router = APIRouter(prefix="/assessments", tags=["Assessments"])

storage_path = settings.QUESTION_PAPER_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=AssessmentOut)
def upload_assessment(
    title: str = Form(...),
    course_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
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


@router.post("/", response_model=AssessmentOut)
def create_assessment(assessment: AssessmentCreate, db: Session = Depends(get_db)):
    db_assessment = Assessment(**assessment.model_dump())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


@router.get("/", response_model=list[AssessmentOut])
def get_assessments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    assessments = db.query(Assessment).offset(skip).limit(limit).all()
    if not assessments:
        raise HTTPException(status_code=404, detail="No assessments found")
    return assessments


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(assessment_id: UUID, db: Session = Depends(get_db)):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.patch("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: UUID, update: AssessmentUpdate, db: Session = Depends(get_db)
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{assessment_id}")
def delete_assessment(assessment_id: UUID, db: Session = Depends(get_db)):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted"}


@router.get("/{assessment_id}/questions", response_model=list[QuestionOut])
def get_assessment_questions(assessment_id: UUID, db: Session = Depends(get_db)):
    questions = db.query(Question).filter(Question.assessment_id == assessment_id).all()
    if not questions:
        raise HTTPException(
            status_code=404, detail="No questions found for this assessment"
        )
    return questions
