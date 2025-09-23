from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.dependencies import get_db, get_current_user, require_lecturer_or_ta_access, validate_course_access
from app.models.user import User
from app.schemas.mark_query import MarkQueryOut, MarkQueryUpdate, MarkQueryResponse, MarkQueryStats, QueryStatus
from app.crud import mark_query as crud_mark_query
from app.models.question_result import QuestionResult

router = APIRouter()


@router.get("/course/{course_id}", response_model=List[MarkQueryOut])
def get_course_queries(
    course_id: UUID,
    status: Optional[QueryStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Get all queries for a course (lecturers/TAs only)"""
    
    queries = crud_mark_query.get_course_queries(db, course_id, status, skip, limit)
    return [_enrich_query_response(db, query) for query in queries]


@router.get("/assessment/{assessment_id}", response_model=List[MarkQueryOut])
def get_assessment_queries(
    assessment_id: UUID,
    status: Optional[QueryStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all queries for a specific assessment"""
    
    # Get the assessment and validate access through course
    from app.models.assessment import Assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    validate_course_access(db, current_user, assessment.course_id)
    
    queries = crud_mark_query.get_assessment_queries(db, assessment_id, status)
    return [_enrich_query_response(db, query) for query in queries]


@router.get("/{query_id}", response_model=MarkQueryOut)
def get_query_details(
    query_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific query"""
    
    db_query = crud_mark_query.get_mark_query(db, query_id)
    if not db_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Validate access through course
    validate_course_access(db, current_user, db_query.assessment.course_id)
    
    return _enrich_query_response(db, db_query)


@router.put("/{query_id}/respond", response_model=MarkQueryOut)
def respond_to_query(
    query_id: UUID,
    response: MarkQueryResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Respond to a mark query (approve/reject/request more info)"""
    
    db_query = crud_mark_query.get_mark_query(db, query_id)
    if not db_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Validate access through course
    validate_course_access(db, current_user, db_query.assessment.course_id)
    
    # Can only respond to pending or under_review queries
    if db_query.status not in ['pending', 'under_review']:
        raise HTTPException(status_code=400, detail="Query has already been resolved")
    
    # If approving a mark change, update the actual question result
    if response.status == QueryStatus.approved and response.new_mark is not None:
        if db_query.question_id:
            # Update specific question mark
            question_result = db.query(QuestionResult).filter(
                QuestionResult.student_id == db_query.student_id,
                QuestionResult.question_id == db_query.question_id
            ).first()
            
            if question_result:
                question_result.mark = response.new_mark
                question_result.comment = f"Updated via query: {response.reviewer_response}"
            else:
                # Create new question result if it doesn't exist
                from app.models.question_result import QuestionResult as QRModel
                question_result = QRModel(
                    student_id=db_query.student_id,
                    assessment_id=db_query.assessment_id,
                    question_id=db_query.question_id,
                    marker_id=current_user.id,
                    mark=response.new_mark,
                    comment=f"Added via query: {response.reviewer_response}"
                )
                db.add(question_result)
    
    # Update the query
    update_data = MarkQueryUpdate(
        status=response.status,
        reviewer_response=response.reviewer_response,
        new_mark=response.new_mark
    )
    
    updated_query = crud_mark_query.update_mark_query(db, query_id, update_data, current_user.id)
    if not updated_query:
        raise HTTPException(status_code=404, detail="Failed to update query")
    
    return _enrich_query_response(db, updated_query)


@router.put("/{query_id}/status", response_model=MarkQueryOut)
def update_query_status(
    query_id: UUID,
    status: QueryStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update just the status of a query (e.g., mark as under review)"""
    
    db_query = crud_mark_query.get_mark_query(db, query_id)
    if not db_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Validate access through course
    validate_course_access(db, current_user, db_query.assessment.course_id)
    
    update_data = MarkQueryUpdate(status=status)
    updated_query = crud_mark_query.update_mark_query(db, query_id, update_data, current_user.id)
    
    if not updated_query:
        raise HTTPException(status_code=404, detail="Failed to update query")
    
    return _enrich_query_response(db, updated_query)


@router.get("/course/{course_id}/stats", response_model=MarkQueryStats)
def get_query_stats(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Get query statistics for a course"""
    
    stats = crud_mark_query.get_query_stats(db, course_id)
    return MarkQueryStats(**stats)


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