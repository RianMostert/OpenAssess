import os
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import FileResponse
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
from app.core.config import settings
from app.models.user import User
from app.models.assessment import Assessment
from app.dependencies import get_current_user
from app.core.security import can_manage_assessments, can_manage_course
from app.utils.validators import EntityValidator, AccessValidator, FileValidator
from app.core.constants import PrimaryRoles


router = APIRouter(prefix="/uploaded-files", tags=["Uploaded Files"])

storage_path = settings.ANSWER_SHEET_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


@router.post("/bulk-upload", response_model=List[UploadedFileOut])
def bulk_upload_answer_sheets(
    assessment_id: UUID = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists and user has convener access
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)
    AccessValidator.validate_convener_access(db, current_user, assessment.course_id)

    course_id = assessment.course_id
    uploaded_files = []

    for file in files:
        filename = file.filename
        if not filename.lower().endswith(".pdf"):
            continue

        student_number = filename.split("_")[0].split(".")[0]
        student = db.query(User).filter(User.student_number == student_number).first()
        if not student:
            continue

        # exists = (
        #     db.query(UploadedFile)
        #     .filter_by(assessment_id=assessment_id, student_id=student.id)
        #     .first()
        # )
        # if exists:
        #     continue

        path = (
            settings.ANSWER_SHEET_STORAGE_FOLDER / str(course_id) / str(assessment_id)
        )
        os.makedirs(path, exist_ok=True)
        file_path = path / f"{student.id}.pdf"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        uploaded = UploadedFile(
            id=uuid4(),
            assessment_id=assessment_id,
            student_id=student.id,
            uploaded_by=current_user.id,
            answer_sheet_file_path=str(file_path),
        )
        db.add(uploaded)
        uploaded_files.append(uploaded)

    db.commit()
    return uploaded_files


@router.post("/upload", response_model=UploadedFileOut)
def upload_file(
    assessment_id: UUID = Form(...),
    student_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate assessment exists
    assessment = EntityValidator.get_assessment_or_404(db, assessment_id)

    is_course_staff = can_manage_assessments(current_user, assessment.course_id)
    is_target_student = current_user.id == student_id

    if not (current_user.primary_role_id == PrimaryRoles.ADMINISTRATOR or is_course_staff or is_target_student):
        raise HTTPException(
            status_code=403,
            detail="Only the student or course staff can upload",
        )

    existing = (
        db.query(UploadedFile)
        .filter_by(assessment_id=assessment_id, student_id=student_id)
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
        uploaded_by=current_user.id,
        answer_sheet_file_path=str(file_path),
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@router.get("/{file_id}/answer-sheet")
def download_answer_sheet(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file or not file.answer_sheet_file_path:
        raise HTTPException(status_code=404, detail="Answer sheet not found")

    # Allow admins, the student themselves, conveners, and facilitators
    from app.core.security import can_grade_assessments
    if not (
        current_user.primary_role_id == PrimaryRoles.ADMINISTRATOR
        or file.student_id == current_user.id
        or can_grade_assessments(current_user, file.assessment.course_id)
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    file_path = Path(file.answer_sheet_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(
        file_path, filename=file_path.name, media_type="application/pdf"
    )


@router.get("/{file_id}", response_model=UploadedFileOut)
def get_uploaded_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    # Allow admins, the student themselves, conveners, and facilitators
    from app.core.security import can_grade_assessments
    if not (
        current_user.primary_role_id == PrimaryRoles.ADMINISTRATOR
        or file.student_id == current_user.id
        or can_grade_assessments(current_user, file.assessment.course_id)
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    return file


@router.get("/download/{file_id}")
def download_uploaded_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    file_path = Path(file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")


@router.patch("/{file_id}", response_model=UploadedFileOut)
def update_uploaded_file(
    file_id: UUID,
    update: UploadedFileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    # Validate assessment exists
    assessment = EntityValidator.get_assessment_or_404(db, file.assessment_id)

    # Allow admins, the student themselves, conveners, and facilitators
    from app.core.security import can_grade_assessments
    is_course_staff = can_grade_assessments(current_user, assessment.course_id)
    is_target_student = file.student_id == current_user.id

    if not (current_user.primary_role_id == PrimaryRoles.ADMINISTRATOR or is_course_staff or is_target_student):
        raise HTTPException(
            status_code=403,
            detail="Only the student or course staff can update",
        )

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(file, field, value)
    db.commit()
    db.refresh(file)
    return file


@router.delete("/{file_id}")
def delete_uploaded_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    # Validate assessment exists
    assessment = EntityValidator.get_assessment_or_404(db, file.assessment_id)

    is_course_staff = can_manage_assessments(current_user, assessment.course_id)
    is_target_student = file.student_id == current_user.id

    if not (current_user.primary_role_id == PrimaryRoles.ADMINISTRATOR or is_course_staff or is_target_student):
        raise HTTPException(
            status_code=403,
            detail="Only the student or course staff can delete",
        )

    file_path = Path(file.answer_sheet_file_path)
    if file_path.exists():
        file_path.unlink()

    db.delete(file)
    db.commit()
    return {"message": "Uploaded file deleted"}
