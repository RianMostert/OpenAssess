from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut
from app.models.question import Question
from app.dependencies import get_db

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/", response_model=QuestionOut)
def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    db_question = Question(**question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@router.get("/{question_id}", response_model=QuestionOut)
def get_question(question_id: UUID, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.patch("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: UUID, update: QuestionUpdate, db: Session = Depends(get_db)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}")
def delete_question(question_id: UUID, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    return {"message": "Question deleted"}
