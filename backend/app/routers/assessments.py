from collections import defaultdict
import csv
from io import StringIO
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
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from pathlib import Path
import shutil

from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentOut
from app.models.assessment import Assessment
from app.schemas.question import QuestionOut
from app.models.question import Question
from app.models.uploaded_file import UploadedFile
from app.schemas.uploaded_file import UploadedFileOut
from app.models.user import User
from app.models.question_result import QuestionResult
from app.dependencies import get_current_user
from app.core.security import has_course_role


from app.dependencies import get_db
from app.core.config import settings

router = APIRouter(prefix="/assessments", tags=["Assessments"])

storage_path = settings.QUESTION_PAPER_STORAGE_FOLDER
storage_path.mkdir(parents=True, exist_ok=True)


@router.post("/upload/question-paper", response_model=dict)
def upload_question_paper(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    assessment_id: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # if not has_course_role(current_user, course_id, "teacher", "ta"):
    #     raise HTTPException(status_code=403, detail="Not authorized to upload")

    destination_dir = storage_path / course_id / assessment_id
    os.makedirs(destination_dir, exist_ok=True)

    file_path = destination_dir / f"{uuid4()}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"file_path": str(file_path)}


@router.post("/upload", response_model=AssessmentOut)
def upload_assessment(
    title: str = Form(...),
    course_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not has_course_role(current_user, course_id, "teacher", "ta"):
        raise HTTPException(status_code=403, detail="Not authorized to upload")

    file_id = uuid4()
    filename = f"{file_id}_{file.filename}"
    file_path = storage_path / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_assessment = Assessment(
        id=file_id,
        title=title,
        course_id=course_id,
        question_paper_file_path=str(file_path),
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


@router.get("/{assessment_id}/questions", response_model=list[QuestionOut])
def get_assessment_questions(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(
        current_user, assessment.course_id, "student", "ta", "teacher"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to view questions")

    questions = db.query(Question).filter(Question.assessment_id == assessment.id).all()
    # if not questions:
    #     raise HTTPException(status_code=404, detail="No questions found")
    return questions


@router.get("/{assessment_id}/question-paper")
def download_question_paper(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment or not assessment.question_paper_file_path:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if not has_course_role(
        current_user, assessment.course_id, "student", "ta", "teacher"
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to view this question paper"
        )

    file_path = Path(assessment.question_paper_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(
        file_path, filename=file_path.name, media_type="application/pdf"
    )


@router.get("/{assessment_id}/answer-sheets", response_model=List[UploadedFileOut])
def list_student_answer_sheets(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not (current_user.is_admin or assessment.course.teacher_id == current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    files = (
        db.query(UploadedFile, User)
        .join(User, UploadedFile.student_id == User.id)
        .filter(UploadedFile.assessment_id == assessment_id)
        .order_by(UploadedFile.uploaded_at)
        .all()
    )

    results = []
    for uploaded_file, user in files:
        results.append(
            UploadedFileOut(
                **uploaded_file.__dict__,
                student_name=user.first_name + " " + user.last_name,
                student_number=user.student_number,
            )
        )
    return results


@router.get("/{assessment_id}/results/download", response_class=StreamingResponse)
def download_assessment_results_csv(assessment_id: UUID, db: Session = Depends(get_db)):
    questions = (
        db.query(Question)
        .filter(Question.assessment_id == assessment_id)
        .order_by(Question.question_number)
        .all()
    )

    if not questions:
        raise HTTPException(
            status_code=404, detail="No questions found for this assessment."
        )

    question_ids = [q.id for q in questions]
    question_labels = [f"{q.question_number}" for q in questions]

    results = (
        db.query(QuestionResult, User)
        .join(User, User.id == QuestionResult.student_id)
        .filter(QuestionResult.assessment_id == assessment_id)
        .all()
    )

    if not results:
        raise HTTPException(
            status_code=404, detail="No results found for this assessment."
        )

    students = defaultdict(
        lambda: {
            "first_name": "",
            "last_name": "",
            "student_number": "",
            "marks": {qid: None for qid in question_ids},
        }
    )

    for result, user in results:
        s = students[user.id]
        s["first_name"] = user.first_name
        s["last_name"] = user.last_name
        s["student_number"] = user.student_number
        s["marks"][result.question_id] = result.mark

    output = StringIO()
    writer = csv.writer(output)

    header = ["student_number", "first_name", "last_name"] + question_labels + ["total"]
    writer.writerow(header)

    for s in students.values():
        marks = [(s["marks"].get(qid) or 0) for qid in question_ids]
        total = sum(marks)
        row = [s["student_number"], s["first_name"], s["last_name"]] + marks + [total]
        writer.writerow(row)

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=assessment_{assessment_id}_results.csv"
        },
    )


@router.post("/", response_model=AssessmentOut)
def create_assessment(
    assessment: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("Creating assessment:", assessment.model_dump())
    if not has_course_role(current_user, assessment.course_id, "teacher", "ta"):
        raise HTTPException(
            status_code=403, detail="Not authorized to create assessment"
        )

    db_assessment = Assessment(**assessment.model_dump())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


@router.get("/", response_model=list[AssessmentOut])
def get_assessments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        return db.query(Assessment).offset(skip).limit(limit).all()

    course_ids = [r.course_id for r in current_user.course_roles]
    return (
        db.query(Assessment)
        .filter(Assessment.course_id.in_(course_ids))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(
        current_user, assessment.course_id, "student", "ta", "teacher"
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to view this assessment"
        )

    return assessment


@router.patch("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: UUID,
    update: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(current_user, assessment.course_id, "teacher", "ta"):
        raise HTTPException(status_code=403, detail="Not authorized to update")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{assessment_id}")
def delete_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not (current_user.is_admin or assessment.course.teacher_id == current_user.id):
        raise HTTPException(
            status_code=403, detail="Only course teacher or admin can delete"
        )

    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted"}
