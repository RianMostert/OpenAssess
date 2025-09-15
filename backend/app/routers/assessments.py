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
from sqlalchemy import func
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
    
    print(f"Uploading question paper to: {file_path}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    print(f"Question paper uploaded successfully: {file_path}")
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
    print(f"Serving question paper: {file_path} (exists: {file_path.exists()})")
    
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
    question_labels = [f" {q.question_number}" for q in questions]

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

    # Clean up old question paper file if a new one is being set
    update_data = update.model_dump(exclude_unset=True)
    if "question_paper_file_path" in update_data and update_data["question_paper_file_path"]:
        old_file_path = assessment.question_paper_file_path
        if old_file_path and old_file_path != update_data["question_paper_file_path"]:
            try:
                old_path = Path(old_file_path)
                if old_path.exists():
                    old_path.unlink()  # Delete the old file
                    print(f"Deleted old question paper: {old_file_path}")
            except Exception as e:
                print(f"Failed to delete old question paper {old_file_path}: {e}")

    for field, value in update_data.items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.patch("/{assessment_id}/publish", response_model=AssessmentOut)
def toggle_assessment_publication(
    assessment_id: UUID,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish or unpublish an assessment (makes results visible/invisible to students)"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(current_user, assessment.course_id, "teacher", "ta"):
        raise HTTPException(status_code=403, detail="Not authorized to publish/unpublish")

    publish = request.get("published", False)
    assessment.published = publish
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


@router.get("/{assessment_id}/stats")
def get_assessment_stats(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive statistics for an assessment"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if not has_course_role(current_user, assessment.course_id, "teacher", "ta"):
        raise HTTPException(status_code=403, detail="Not authorized to view stats")

    # Get all questions for this assessment
    questions = (
        db.query(Question)
        .filter(Question.assessment_id == assessment_id)
        .order_by(Question.question_number)
        .all()
    )

    if not questions:
        return {
            "grading_completion": {
                "total_submissions": 0,
                "graded_submissions": 0,
                "ungraded_submissions": 0,
                "completion_percentage": 0
            },
            "grade_distribution": {
                "average_score": 0,
                "median_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "score_ranges": []
            },
            "question_performance": []
        }

    # Get all students who submitted for this assessment
    submitted_students = (
        db.query(UploadedFile.student_id)
        .filter(UploadedFile.assessment_id == assessment_id)
        .distinct()
        .all()
    )
    submitted_student_ids = [s.student_id for s in submitted_students]
    total_submissions = len(submitted_student_ids)

    if total_submissions == 0:
        return {
            "grading_completion": {
                "total_submissions": 0,
                "graded_submissions": 0,
                "ungraded_submissions": 0,
                "completion_percentage": 0
            },
            "grade_distribution": {
                "average_score": 0,
                "median_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "score_ranges": []
            },
            "question_performance": []
        }

    # Calculate grading completion
    fully_graded_students = (
        db.query(QuestionResult.student_id)
        .filter(
            QuestionResult.assessment_id == assessment_id,
            QuestionResult.mark.isnot(None),
            QuestionResult.student_id.in_(submitted_student_ids)
        )
        .group_by(QuestionResult.student_id)
        .having(func.count(QuestionResult.question_id) == len(questions))
        .all()
    )

    graded_submissions = len(fully_graded_students)
    ungraded_submissions = total_submissions - graded_submissions
    completion_percentage = (graded_submissions / total_submissions * 100) if total_submissions > 0 else 0

    # Calculate grade distribution for fully graded students only
    if graded_submissions > 0:
        # Get total scores for each fully graded student
        student_scores = []
        fully_graded_student_ids = [s.student_id for s in fully_graded_students]
        
        for student_id in fully_graded_student_ids:
            student_total = (
                db.query(func.sum(QuestionResult.mark))
                .filter(
                    QuestionResult.assessment_id == assessment_id,
                    QuestionResult.student_id == student_id,
                    QuestionResult.mark.isnot(None)
                )
                .scalar()
            ) or 0
            
            # Convert to percentage
            total_possible = sum(q.max_marks for q in questions)
            if total_possible > 0:
                percentage = (student_total / total_possible) * 100
                student_scores.append(percentage)

        # Calculate statistics
        if student_scores:
            average_score = sum(student_scores) / len(student_scores)
            sorted_scores = sorted(student_scores)
            median_score = sorted_scores[len(sorted_scores) // 2] if len(sorted_scores) % 2 == 1 else (sorted_scores[len(sorted_scores) // 2 - 1] + sorted_scores[len(sorted_scores) // 2]) / 2
            highest_score = max(student_scores)
            lowest_score = min(student_scores)

            # Create score ranges (0-39, 40-49, 50-59, 60-69, 70-79, 80-89, 90-100)
            score_ranges = [
                {"range": "0-39", "count": 0},
                {"range": "40-49", "count": 0},
                {"range": "50-59", "count": 0},
                {"range": "60-69", "count": 0},
                {"range": "70-79", "count": 0},
                {"range": "80-89", "count": 0},
                {"range": "90-100", "count": 0}
            ]
            
            for score in student_scores:
                if score < 40:
                    score_ranges[0]["count"] += 1
                elif score < 50:
                    score_ranges[1]["count"] += 1
                elif score < 60:
                    score_ranges[2]["count"] += 1
                elif score < 70:
                    score_ranges[3]["count"] += 1
                elif score < 80:
                    score_ranges[4]["count"] += 1
                elif score < 90:
                    score_ranges[5]["count"] += 1
                else:
                    score_ranges[6]["count"] += 1
        else:
            average_score = median_score = highest_score = lowest_score = 0
            score_ranges = []
    else:
        average_score = median_score = highest_score = lowest_score = 0
        score_ranges = []

    # Calculate question-wise performance
    question_performance = []
    for question in questions:
        # Get all results for this question from submitted students
        question_results = (
            db.query(QuestionResult)
            .filter(
                QuestionResult.assessment_id == assessment_id,
                QuestionResult.question_id == question.id,
                QuestionResult.student_id.in_(submitted_student_ids),
                QuestionResult.mark.isnot(None)
            )
            .all()
        )

        graded_count = len(question_results)
        ungraded_count = total_submissions - graded_count
        
        if question_results:
            marks = [qr.mark for qr in question_results]
            avg_mark = sum(marks) / len(marks)
            max_mark = max(marks)
            min_mark = min(marks)
            avg_percentage = (avg_mark / question.max_marks * 100) if question.max_marks > 0 else 0
        else:
            avg_mark = max_mark = min_mark = avg_percentage = 0

        question_performance.append({
            "question_number": question.question_number,
            "question_title": f"Question {question.question_number}",
            "max_marks": question.max_marks,
            "graded_count": graded_count,
            "ungraded_count": ungraded_count,
            "average_mark": round(avg_mark, 2) if avg_mark else 0,
            "average_percentage": round(avg_percentage, 1) if avg_percentage else 0,
            "highest_mark": max_mark if max_mark else 0,
            "lowest_mark": min_mark if min_mark else 0
        })

    return {
        "grading_completion": {
            "total_submissions": total_submissions,
            "graded_submissions": graded_submissions,
            "ungraded_submissions": ungraded_submissions,
            "completion_percentage": round(completion_percentage, 1)
        },
        "grade_distribution": {
            "average_score": round(average_score, 1) if average_score else 0,
            "median_score": round(median_score, 1) if median_score else 0,
            "highest_score": round(highest_score, 1) if highest_score else 0,
            "lowest_score": round(lowest_score, 1) if lowest_score else 0,
            "score_ranges": score_ranges
        },
        "question_performance": question_performance
    }
