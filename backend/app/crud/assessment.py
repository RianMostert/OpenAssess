from sqlalchemy.orm import Session
from app.models.assessment import Assessment
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate
from uuid import UUID


def create_assessment(db: Session, assessment_data: AssessmentCreate):
    new_assessment = Assessment(**assessment_data.model_dump())
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    return new_assessment


def get_assessment_by_id(db: Session, assessment_id: UUID):
    return db.query(Assessment).filter(Assessment.id == assessment_id).first()


def get_assessments_by_course(db: Session, course_id: UUID):
    return db.query(Assessment).filter(Assessment.course_id == course_id).all()


def update_assessment(
    db: Session, assessment: Assessment, update_data: AssessmentUpdate
):
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(assessment, key, value)

    db.commit()
    db.refresh(assessment)
    return assessment


def delete_assessment(db: Session, assessment_id: UUID):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if assessment:
        db.delete(assessment)
        db.commit()
    return assessment
