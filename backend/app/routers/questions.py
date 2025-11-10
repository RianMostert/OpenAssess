from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut
from app.models.question import Question
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.utils.validators import EntityValidator, AccessValidator

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/", response_model=QuestionOut)
def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, question.assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

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
    # Validate question exists
    question = EntityValidator.get_question_or_404(db, question_id)
    
    # Validate assessment exists and user has course access
    assessment = EntityValidator.get_assessment_or_404(db, question.assessment_id)
    AccessValidator.validate_course_access(db, current_user, assessment.course_id)

    return question


@router.patch("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: UUID,
    update: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate question exists
    question = EntityValidator.get_question_or_404(db, question_id)
    
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, question.assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

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
    # Validate question exists
    question = EntityValidator.get_question_or_404(db, question_id)
    
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, question.assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

    db.delete(question)
    db.commit()
    return {"message": "Question deleted"}
