from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.schemas.uploaded_file import (
    UploadedFileCreate,
    UploadedFileUpdate,
    UploadedFileOut,
)
from app.models.uploaded_file import UploadedFile
from app.dependencies import get_db

router = APIRouter(prefix="/uploaded-files", tags=["Uploaded Files"])


@router.post("/", response_model=UploadedFileOut)
def create_uploaded_file(file: UploadedFileCreate, db: Session = Depends(get_db)):
    # Check uniqueness
    existing = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.assessment_id == file.assessment_id,
            UploadedFile.student_id == file.student_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Upload already exists for this student and assessment",
        )

    db_file = UploadedFile(**file.model_dump())
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@router.get("/{file_id}", response_model=UploadedFileOut)
def get_uploaded_file(file_id: UUID, db: Session = Depends(get_db)):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")
    return file


@router.patch("/{file_id}", response_model=UploadedFileOut)
def update_uploaded_file(
    file_id: UUID, update: UploadedFileUpdate, db: Session = Depends(get_db)
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(file, field, value)
    db.commit()
    db.refresh(file)
    return file


@router.delete("/{file_id}")
def delete_uploaded_file(file_id: UUID, db: Session = Depends(get_db)):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")
    db.delete(file)
    db.commit()
    return {"message": "Uploaded file deleted"}
