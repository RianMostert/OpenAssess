from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.mark_query import (
    MarkQueryCreate, MarkQueryOut, MarkQueryBatchCreate, MarkQueryBatchResponse
)
from app.crud import mark_query as crud_mark_query
from app.utils.validators import EntityValidator

router = APIRouter()


@router.post("/", response_model=MarkQueryOut)
def create_query(
    query_data: MarkQueryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new mark query"""
    
    # Validate assessment exists
    assessment = EntityValidator.get_assessment_or_404(db, query_data.assessment_id)
    
    # Validate question exists and belongs to assessment
    question = EntityValidator.get_question_or_404(db, query_data.question_id)
    if question.assessment_id != query_data.assessment_id:
        raise HTTPException(status_code=404, detail="Question not found for this assessment")
    
    # Check for existing pending query for this question
    if crud_mark_query.check_existing_pending_query(
        db, current_user.id, query_data.assessment_id, query_data.question_id
    ):
        raise HTTPException(
            status_code=409, 
            detail="You already have a pending query for this question"
        )
    
    # Create the query
    db_query = crud_mark_query.create_mark_query(db, query_data, current_user.id)
    
    # Load related data for response
    return _enrich_query_response(db, db_query)


@router.post("/batch", response_model=MarkQueryBatchResponse)
def create_batch_query(
    batch_data: MarkQueryBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit multiple mark queries in a batch"""
    
    # Validate assessment exists
    assessment = EntityValidator.get_assessment_or_404(db, batch_data.assessment_id)
    
    # Validate all questions exist and belong to the assessment
    question_ids = [item.question_id for item in batch_data.question_items if item.question_id]
    if question_ids:
        from app.models.question import Question
        valid_questions = db.query(Question).filter(
            Question.id.in_(question_ids),
            Question.assessment_id == batch_data.assessment_id
        ).all()
        
        valid_question_ids = {q.id for q in valid_questions}
        for question_id in question_ids:
            if question_id not in valid_question_ids:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Question {question_id} not found for this assessment"
                )
    
    try:
        # Create the batch
        batch_id, created_queries = crud_mark_query.create_mark_query_batch(
            db, batch_data, current_user.id
        )
        
        return MarkQueryBatchResponse(
            batch_id=batch_id,
            query_ids=[q.id for q in created_queries],
            created_count=len(created_queries)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


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


@router.get("/my-queries-grouped")
def get_my_queries_grouped(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get student queries grouped by batch_id"""
    return crud_mark_query.get_student_queries_grouped(db, current_user.id)


@router.get("/batch/{batch_id}", response_model=List[MarkQueryOut])
def get_batch_queries(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about all queries in a batch"""
    # Convert string to UUID
    try:
        batch_uuid = UUID(batch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid batch ID format")
    
    # Get all queries in the batch
    queries = crud_mark_query.get_queries_by_batch(db, batch_uuid)
    
    # Ensure all queries belong to the current user
    for query in queries:
        if query.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return [_enrich_query_response(db, query) for query in queries]


@router.get("/{query_id}", response_model=MarkQueryOut)
def get_query(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific query"""
    # Validate query exists
    db_query = EntityValidator.get_mark_query_or_404(db, UUID(query_id))
    
    # Ensure the query belongs to the current user
    if db_query.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return _enrich_query_response(db, db_query)


def _enrich_query_response(db: Session, query: object) -> MarkQueryOut:
    """Add computed fields to query response"""
    
    query_dict = {
        'id': query.id,
        'student_id': query.student_id,
        'assessment_id': query.assessment_id,
        'question_id': query.question_id,
        'batch_id': query.batch_id, 
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
        query_dict['student_number'] = query.student.student_number if hasattr(query.student, 'student_number') else None
    
    if hasattr(query, 'assessment') and query.assessment:
        query_dict['assessment_title'] = query.assessment.title
        
    if hasattr(query, 'question') and query.question:
        query_dict['question_number'] = query.question.question_number
    
    return MarkQueryOut(**query_dict)