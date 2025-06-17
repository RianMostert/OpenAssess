from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.schemas.question_result import (
    QuestionResultCreate,
    QuestionResultUpdate,
    QuestionResultOut,
)
from app.models.question_result import QuestionResult
from app.dependencies import get_db

router = APIRouter(prefix="/question-results", tags=["Question Results"])


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
