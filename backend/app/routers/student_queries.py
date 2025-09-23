from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.mark_query import MarkQueryCreate, MarkQueryOut
from app.crud import mark_query as crud_mark_query
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.question_result import QuestionResult

router = APIRouter()


@router.post("/", response_model=MarkQueryOut)
def create_query(
    query_data: MarkQueryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new mark query"""
    
    # Verify the assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == query_data.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # If querying a specific question, verify it exists and belongs to the assessment
    if query_data.question_id:
        question = db.query(Question).filter(
            Question.id == query_data.question_id,
            Question.assessment_id == query_data.assessment_id
        ).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found for this assessment")
            
        # Get the current mark for this question
        question_result = db.query(QuestionResult).filter(
            QuestionResult.student_id == current_user.id,
            QuestionResult.question_id == query_data.question_id
        ).first()
        current_mark = question_result.mark if question_result else None
    else:
        # For full assessment queries, calculate total current marks
        question_results = db.query(QuestionResult).filter(
            QuestionResult.student_id == current_user.id,
            QuestionResult.assessment_id == query_data.assessment_id
        ).all()
        current_mark = sum(qr.mark for qr in question_results if qr.mark is not None) if question_results else None
    
    # Check for existing pending queries
    if crud_mark_query.check_existing_pending_query(
        db, current_user.id, query_data.assessment_id, query_data.question_id
    ):
        raise HTTPException(
            status_code=409, 
            detail="You already have a pending query for this assessment/question"
        )
    
    # Create the query with current mark
    query_data.current_mark = current_mark
    db_query = crud_mark_query.create_mark_query(db, query_data, current_user.id)
    
    # Load related data for response
    return _enrich_query_response(db, db_query)


@router.get("/my-queries", response_model=List[MarkQueryOut])
def get_my_queries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all queries for the current student"""
    queries = crud_mark_query.get_student_queries(db, current_user.id, skip, limit)
    return [_enrich_query_response(db, query) for query in queries]


@router.get("/{query_id}", response_model=MarkQueryOut)
def get_query(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific query"""
    db_query = crud_mark_query.get_mark_query(db, query_id)
    if not db_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Ensure the query belongs to the current user
    if db_query.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return _enrich_query_response(db, db_query)


def _enrich_query_response(db: Session, query: object) -> MarkQueryOut:
    """Add computed fields to query response"""
    # Convert to dict and add computed fields
    query_dict = {
        'id': query.id,
        'student_id': query.student_id,
        'assessment_id': query.assessment_id,
        'question_id': query.question_id,
        'current_mark': query.current_mark,
        'requested_change': query.requested_change,
        'query_type': query.query_type,
        'status': query.status,
        'reviewer_id': query.reviewer_id,
        'reviewer_response': query.reviewer_response,
        'new_mark': query.new_mark,
        'created_at': query.created_at,
        'updated_at': query.updated_at,
    }
    
    # Add computed fields
    if hasattr(query, 'student') and query.student:
        query_dict['student_name'] = f"{query.student.first_name} {query.student.last_name}"
    
    if hasattr(query, 'assessment') and query.assessment:
        query_dict['assessment_title'] = query.assessment.title
        
    if hasattr(query, 'question') and query.question:
        query_dict['question_number'] = query.question.question_number
    
    return MarkQueryOut(**query_dict)