from sqlalchemy.orm import Session
from app.models.uploaded_file import UploadedFile
from app.schemas.uploaded_file import UploadedFileCreate, UploadedFileUpdate
from uuid import UUID


def create_uploaded_file(db: Session, file_data: UploadedFileCreate):
    new_file = UploadedFile(**file_data.model_dump())
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    return new_file


def get_uploaded_file_by_id(db: Session, file_id: UUID):
    return db.query(UploadedFile).filter(UploadedFile.id == file_id).first()


def get_uploaded_file_by_assessment_and_student(
    db: Session, assessment_id: UUID, student_id: UUID
):
    return (
        db.query(UploadedFile)
        .filter(
            UploadedFile.assessment_id == assessment_id,
            UploadedFile.student_id == student_id,
        )
        .first()
    )


def update_uploaded_file(
    db: Session, file: UploadedFile, file_update: UploadedFileUpdate
):
    for key, value in file_update.model_dump(exclude_unset=True).items():
        setattr(file, key, value)

    db.commit()
    db.refresh(file)
    return file


def delete_uploaded_file(db: Session, file_id: UUID):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if file:
        db.delete(file)
        db.commit()
    return file
