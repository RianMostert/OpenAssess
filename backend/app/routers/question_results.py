from datetime import datetime
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
from datetime import timezone

from app.schemas.question_result import (
    QuestionResultCreate,
    QuestionResultUpdate,
    QuestionResultOut,
)
from app.models.question_result import QuestionResult
from app.models.assessment import Assessment
from app.models.user import User
from app.dependencies import get_db, get_current_user
from app.core.config import settings
from app.core.security import has_course_role

router = APIRouter(prefix="/question-results", tags=["Question Results"])

storage_path = settings.ANNOTATION_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


def validate_marker_access(db: Session, user: User, assessment_id: UUID):
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    course_id = assessment.course_id
    if not has_course_role(user, course_id, "teacher", "ta"):
        raise HTTPException(
            status_code=403, detail="Only teachers or TAs for this course can access"
        )


@router.post("/upload-annotation", response_model=QuestionResultOut)
def upload_annotation(
    assessment_id: UUID = Form(...),
    student_id: UUID = Form(...),
    question_id: UUID = Form(...),
    mark: float = Form(...),
    comment: str = Form(""),
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

    path = settings.ANNOTATION_STORAGE_FOLDER / str(course_id) / str(assessment_id)
    os.makedirs(path, exist_ok=True)

    file_path = path / f"{question_result_id}.json"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if question_result:
        question_result.mark = mark
        question_result.comment = comment
        question_result.annotation_file_path = str(file_path)
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


# @router.get("/{result_id}", response_model=QuestionResultOut)
# def get_question_result(
#     result_id: UUID,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
#     if not result:
#         raise HTTPException(status_code=404, detail="Question result not found")

#     validate_marker_access(db, current_user, result.assessment_id)

#     return result


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
