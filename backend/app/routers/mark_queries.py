from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user, require_lecturer_or_ta_access, validate_course_access
from app.models.user import User
from app.schemas.mark_query import (
    MarkQueryOut, MarkQueryUpdate, MarkQueryResponse, MarkQueryStats, QueryStatus,
    TriageResponse, QueryGroup, BulkStatusUpdate, BulkReviewSubmission, 
    GradeCommitRequest, GradeCommitResponse
)
from app.crud import mark_query as crud_mark_query

router = APIRouter()


class StatusUpdateRequest(BaseModel):
    status: QueryStatus


@router.get("/course/{course_id}", response_model=List[MarkQueryOut])
def get_course_queries(
    course_id: UUID,
    status: Optional[QueryStatus] = None,
    assessment_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Get all queries for a course (lecturers/TAs only)"""
    
    queries = crud_mark_query.get_course_queries(db, course_id, status, skip, limit, assessment_id)
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
    
    # Validate access through course
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
    
    # If approving a mark change, update the question results
    if response.status == QueryStatus.approved and response.new_marks:
        from app.models.question_result import QuestionResult
        
        # Handle single question per query (current model design)
        if db_query.question_id and db_query.question:
            # For single question queries, new_marks should use question_id as key
            new_mark = response.new_marks.get(str(db_query.question_id))
            
            if new_mark is not None:
                # Update or create question result
                question_result = db.query(QuestionResult).filter(
                    QuestionResult.student_id == db_query.student_id,
                    QuestionResult.assessment_id == db_query.assessment_id,
                    QuestionResult.question_id == db_query.question_id
                ).first()
                
                if question_result:
                    question_result.mark = new_mark
                    question_result.comment = f"Updated via query: {response.reviewer_response}"
                else:
                    # Create new question result if it doesn't exist
                    question_result = QuestionResult(
                        student_id=db_query.student_id,
                        assessment_id=db_query.assessment_id,
                        question_id=db_query.question_id,
                        marker_id=current_user.id,
                        mark=new_mark,
                        comment=f"Added via query: {response.reviewer_response}"
                    )
                    db.add(question_result)
    
    # Update the query
    update_data = MarkQueryUpdate(
        status=response.status,
        reviewer_response=response.reviewer_response,
        new_marks=response.new_marks
    )
    
    updated_query = crud_mark_query.update_mark_query(db, query_id, update_data, current_user.id)
    if not updated_query:
        raise HTTPException(status_code=404, detail="Failed to update query")
    
    return _enrich_query_response(db, updated_query)
    
@router.put("/{query_id}/status", response_model=MarkQueryOut)
def update_query_status(
    query_id: UUID,
    status_request: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update just the status of a query (e.g., mark as under review)"""
    
    db_query = crud_mark_query.get_mark_query(db, query_id)
    if not db_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Validate access through course
    validate_course_access(db, current_user, db_query.assessment.course_id)
    
    update_data = MarkQueryUpdate(status=status_request.status)
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


@router.get("/course/{course_id}/triage", response_model=TriageResponse)
def get_triage_view(
    course_id: UUID,
    status: Optional[List[QueryStatus]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Get grouped queries for lecturer triage dashboard"""
    
    # Convert status enums to strings if provided
    status_filter = [s.value for s in status] if status else ['pending', 'under_review']
    
    groups_data = crud_mark_query.get_triage_groups(db, course_id, status_filter)
    
    # Convert to QueryGroup objects
    groups = [QueryGroup(**group_data) for group_data in groups_data]
    
    # Get stats
    stats = crud_mark_query.get_query_stats(db, course_id)
    
    return TriageResponse(
        groups=groups,
        total_groups=len(groups),
        stats=MarkQueryStats(**stats)
    )


@router.put("/bulk/status", response_model=List[MarkQueryOut])
def bulk_update_status(
    update_request: BulkStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Bulk update status for multiple queries"""
    
    # Validate access for all queries
    queries = []
    for query_id in update_request.query_ids:
        db_query = crud_mark_query.get_mark_query(db, query_id)
        if not db_query:
            raise HTTPException(status_code=404, detail=f"Query {query_id} not found")
        
        # Validate access through course
        validate_course_access(db, current_user, db_query.assessment.course_id)
        queries.append(db_query)
    
    # Prepare bulk update data
    updates = []
    for query_id in update_request.query_ids:
        update_data = {
            'id': query_id,
            'status': update_request.status.value,
        }
        if update_request.reviewer_id:
            update_data['reviewer_id'] = update_request.reviewer_id
        updates.append(update_data)
    
    # Perform bulk update
    updated_queries = crud_mark_query.update_queries_batch(db, updates, current_user.id)
    
    return [_enrich_query_response(db, query) for query in updated_queries]


@router.get("/batch/{batch_id}", response_model=List[MarkQueryOut])
def get_batch_queries(
    batch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Get all queries in a batch for workbench review"""
    
    queries = crud_mark_query.get_queries_by_batch(db, batch_id)
    
    if not queries:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Validate access through course (check first query)
    validate_course_access(db, current_user, queries[0].assessment.course_id)
    
    return [_enrich_query_response(db, query) for query in queries]


@router.put("/batch/review", response_model=List[MarkQueryOut])
def bulk_review_queries(
    review_request: BulkReviewSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Submit bulk review decisions for staging"""
    
    # Validate access for all queries
    query_ids = [review.id for review in review_request.reviews]
    queries = []
    
    for query_id in query_ids:
        db_query = crud_mark_query.get_mark_query(db, query_id)
        if not db_query:
            raise HTTPException(status_code=404, detail=f"Query {query_id} not found")
        
        # Validate access through course
        validate_course_access(db, current_user, db_query.assessment.course_id)
        queries.append(db_query)
    
    # Prepare bulk update data
    updates = []
    for review in review_request.reviews:
        update_data = {
            'id': review.id,
            'reviewer_response': review.reviewer_response,
            'status': review.status.value,
        }
        if review.new_mark is not None:
            update_data['new_mark'] = review.new_mark
        updates.append(update_data)
    
    # Perform bulk update (staging)
    updated_queries = crud_mark_query.update_queries_batch(db, updates, current_user.id)
    
    return [_enrich_query_response(db, query) for query in updated_queries]


@router.post("/commit-grades", response_model=GradeCommitResponse)
def commit_grades_to_gradebook(
    commit_request: GradeCommitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer_or_ta_access()),
):
    """Commit approved mark changes to the gradebook (two-step workflow)"""
    
    committed_ids = []
    failed_ids = []
    errors = []
    
    for query_id in commit_request.query_ids:
        try:
            db_query = crud_mark_query.get_mark_query(db, query_id)
            if not db_query:
                failed_ids.append(query_id)
                errors.append(f"Query {query_id} not found")
                continue
            
            # Validate access through course
            validate_course_access(db, current_user, db_query.assessment.course_id)
            
            # Only commit approved queries with new marks
            if db_query.status != 'approved' or db_query.new_mark is None:
                failed_ids.append(query_id)
                errors.append(f"Query {query_id} is not approved or has no new mark")
                continue
            
            # Only commit queries for specific questions (not assessment-wide)
            if db_query.question_id is None:
                failed_ids.append(query_id)
                errors.append(f"Query {query_id} is assessment-wide and cannot update question marks")
                continue
            
            # Update the question result in gradebook
            from app.models.question_result import QuestionResult
            
            question_result = db.query(QuestionResult).filter(
                QuestionResult.student_id == db_query.student_id,
                QuestionResult.assessment_id == db_query.assessment_id,
                QuestionResult.question_id == db_query.question_id
            ).first()
            
            if question_result:
                # Update existing result
                question_result.mark = db_query.new_mark
                question_result.comment = f"Updated via query: {db_query.reviewer_response}"
            else:
                # Create new question result
                question_result = QuestionResult(
                    student_id=db_query.student_id,
                    assessment_id=db_query.assessment_id,
                    question_id=db_query.question_id,
                    marker_id=current_user.id,
                    mark=db_query.new_mark,
                    comment=f"Added via query: {db_query.reviewer_response}"
                )
                db.add(question_result)
            
            # Mark query as resolved
            db_query.status = 'resolved'
            db_query.updated_at = datetime.utcnow()
            
            committed_ids.append(query_id)
            
        except Exception as e:
            failed_ids.append(query_id)
            errors.append(f"Query {query_id}: {str(e)}")
    
    # Commit all changes
    db.commit()
    
    return GradeCommitResponse(
        committed_count=len(committed_ids),
        failed_count=len(failed_ids),
        committed_query_ids=committed_ids,
        failed_query_ids=failed_ids,
        errors=errors
    )


def _enrich_query_response(db: Session, query: object) -> MarkQueryOut:
    """Add computed fields to query response"""
    # Convert to dict and add computed fields
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
        query_dict['student_number'] = getattr(query.student, 'student_number', None)
    
    if hasattr(query, 'assessment') and query.assessment:
        query_dict['assessment_title'] = query.assessment.title
        
    if hasattr(query, 'question') and query.question:
        query_dict['question_number'] = str(query.question.question_number)
    
    return MarkQueryOut(**query_dict)