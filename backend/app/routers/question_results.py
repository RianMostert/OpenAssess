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

from app.dependencies import get_db
from app.core.config import settings

router = APIRouter(prefix="/question-results", tags=["Question Results"])

storage_path = settings.ANNOTATION_STORAGE_PATH
storage_path.mkdir(parents=True, exist_ok=True)


@router.post("/upload-annotation", response_model=QuestionResultOut)
def upload_annotation(
    assessment_id: UUID = Form(...),
    student_id: UUID = Form(...),
    question_id: UUID = Form(...),
    marker_id: UUID = Form(...),
    mark: float = Form(...),
    comment: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(QuestionResult)
        .filter_by(
            assessment_id=assessment_id,
            student_id=student_id,
            question_id=question_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Result already exists")

    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files allowed")

    file_id = uuid4()
    filename = f"{file_id}_{file.filename}"
    file_path = storage_path / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_result = QuestionResult(
        id=file_id,
        assessment_id=assessment_id,
        student_id=student_id,
        question_id=question_id,
        marker_id=marker_id,
        mark=mark,
        comment=comment,
        annotation_file_path=str(file_path),
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result


@router.get("/{result_id}/annotation")
def download_annotation(result_id: UUID, db: Session = Depends(get_db)):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result or not result.annotation_file_path:
        raise HTTPException(status_code=404, detail="Annotation not found")

    file_path = Path(result.annotation_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(
        file_path, filename=file_path.name, media_type="application/json"
    )


@router.post("/", response_model=QuestionResultOut)
def create_question_result(result: QuestionResultCreate, db: Session = Depends(get_db)):
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
        raise HTTPException(
            status_code=400,
            detail="Result already exists for this student and question",
        )

    db_result = QuestionResult(**result.model_dump())
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result


@router.get("/{result_id}", response_model=QuestionResultOut)
def get_question_result(result_id: UUID, db: Session = Depends(get_db)):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")
    return result


@router.patch("/{result_id}", response_model=QuestionResultOut)
def update_question_result(
    result_id: UUID, update: QuestionResultUpdate, db: Session = Depends(get_db)
):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(result, field, value)
    db.commit()
    db.refresh(result)
    return result


@router.delete("/{result_id}")
def delete_question_result(result_id: UUID, db: Session = Depends(get_db)):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Question result not found")
    db.delete(result)
    db.commit()
    return {"message": "Question result deleted"}
