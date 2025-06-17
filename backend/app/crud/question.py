from sqlalchemy.orm import Session
from app.models.question import Question
from app.schemas.question import QuestionCreate, QuestionUpdate
from uuid import UUID


def create_question(db: Session, question_data: QuestionCreate):
    new_question = Question(**question_data.model_dump())
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question


def get_question_by_id(db: Session, question_id: UUID):
    return db.query(Question).filter(Question.id == question_id).first()


def get_questions_by_assessment(db: Session, assessment_id: UUID):
    return db.query(Question).filter(Question.assessment_id == assessment_id).all()


def update_question(db: Session, question: Question, update_data: QuestionUpdate):
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(question, key, value)

    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question_id: UUID):
    question = db.query(Question).filter(Question.id == question_id).first()
    if question:
        db.delete(question)
        db.commit()
    return question
