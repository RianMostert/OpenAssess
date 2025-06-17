from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentOut
from app.models.assessment import Assessment
from app.dependencies import get_db

router = APIRouter(prefix="/assessments", tags=["Assessments"])


@router.post("/", response_model=AssessmentOut)
def create_assessment(assessment: AssessmentCreate, db: Session = Depends(get_db)):
    db_assessment = Assessment(**assessment.model_dump())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


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
