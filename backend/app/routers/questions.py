from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut
from app.models.question import Question
from app.models.assessment import Assessment
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.core.security import has_course_role, can_manage_assessments

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/", response_model=QuestionOut)
def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = (
        db.query(Assessment).filter(Assessment.id == question.assessment_id).first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not can_manage_assessments(current_user, assessment.course_id):
        raise HTTPException(status_code=403, detail="Only course conveners can create questions")

    db_question = Question(**question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@router.get("/{question_id}", response_model=QuestionOut)
def get_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    assessment = (
        db.query(Assessment).filter(Assessment.id == question.assessment_id).first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(
        current_user, assessment.course_id, "teacher", "ta", "student"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to view question")

    return question


@router.patch("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: UUID,
    update: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    assessment = (
        db.query(Assessment).filter(Assessment.id == question.assessment_id).first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not can_manage_assessments(current_user, assessment.course_id):
        raise HTTPException(status_code=403, detail="Only course conveners can update questions")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}")
def delete_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    assessment = (
        db.query(Assessment).filter(Assessment.id == question.assessment_id).first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not can_manage_assessments(current_user, assessment.course_id):
        raise HTTPException(status_code=403, detail="Only course conveners can delete questions")

    db.delete(question)
    db.commit()
    return {"message": "Question deleted"}
