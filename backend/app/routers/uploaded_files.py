from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from pathlib import Path
import shutil

from app.schemas.uploaded_file import (
    UploadedFileUpdate,
    UploadedFileOut,
)
from app.models.uploaded_file import UploadedFile
from app.dependencies import get_db
from app.config import settings

router = APIRouter(prefix="/uploaded-files", tags=["Uploaded Files"])

storage_path = settings.ANSWER_SHEET_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=UploadedFileOut)
def upload_file(
    assessment_id: UUID = Form(...),
    student_id: UUID = Form(...),
    uploaded_by: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Check uniqueness
    existing = (
        db.query(UploadedFile)
        .filter_by(
            assessment_id=assessment_id,
            student_id=student_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Upload already exists")

    file_id = uuid4()
    filename = f"{file_id}_{file.filename}"
    file_path = storage_path / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_file = UploadedFile(
        id=file_id,
        assessment_id=assessment_id,
        student_id=student_id,
        uploaded_by=uploaded_by,
        answer_sheet_file_path=str(file_path),
    )
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


@router.get("/download/{file_id}")
def download_uploaded_file(
    file_id: UUID,
    db: Session = Depends(get_db),
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    file_path = Path(file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")


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

    file_path = Path(file.answer_sheet_file_path)
    if file_path.exists():
        file_path.unlink()

    db.delete(file)
    db.commit()
    return {"message": "Uploaded file deleted"}
