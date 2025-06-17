from sqlalchemy.orm import Session
from app.models.question_result import QuestionResult
from app.schemas.question_result import QuestionResultCreate, QuestionResultUpdate
from uuid import UUID


def create_question_result(db: Session, result_data: QuestionResultCreate):
    new_result = QuestionResult(**result_data.model_dump())
    db.add(new_result)
    db.commit()
    db.refresh(new_result)
    return new_result


def get_question_result_by_id(db: Session, result_id: UUID):
    return db.query(QuestionResult).filter(QuestionResult.id == result_id).first()


def get_question_result_by_keys(
    db: Session, assessment_id: UUID, student_id: UUID, question_id: UUID
):
    return (
        db.query(QuestionResult)
        .filter(
            QuestionResult.assessment_id == assessment_id,
            QuestionResult.student_id == student_id,
            QuestionResult.question_id == question_id,
        )
        .first()
    )


def update_question_result(
    db: Session, result: QuestionResult, update_data: QuestionResultUpdate
):
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(result, key, value)

    db.commit()
    db.refresh(result)
    return result


def delete_question_result(db: Session, result_id: UUID):
    result = db.query(QuestionResult).filter(QuestionResult.id == result_id).first()
    if result:
        db.delete(result)
        db.commit()
    return result
