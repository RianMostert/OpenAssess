from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from app.models.mark_query import MarkQuery
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.mark_query import MarkQueryCreate, MarkQueryUpdate, QueryStatus, MarkQueryBatchCreate


def create_mark_query(db: Session, query: MarkQueryCreate, student_id: UUID) -> MarkQuery:
    """Create a new mark query"""
    db_query = MarkQuery(
        student_id=student_id,
        assessment_id=query.assessment_id,
        question_id=query.question_id,
        current_mark=query.current_mark,
        requested_change=query.requested_change,
        query_type=query.query_type.value
    )
    
    db.add(db_query)
    db.commit()
    db.refresh(db_query)
    return db_query


def create_mark_query_batch(db: Session, batch_query: MarkQueryBatchCreate, student_id: UUID) -> tuple[UUID, List[MarkQuery]]:
    """Create multiple mark queries with shared batch_id"""
    
    batch_id = uuid4()
    created_queries = []
    
    for item in batch_query.question_items:
        # Check for existing pending query for this question (if question_id is provided)
        if item.question_id and check_existing_pending_query(db, student_id, batch_query.assessment_id, item.question_id):
            raise ValueError(f"You already have a pending query for question {item.question_id}")
        
        db_query = MarkQuery(
            student_id=student_id,
            assessment_id=batch_query.assessment_id,
            question_id=item.question_id,  # Can be None for assessment-wide queries
            batch_id=batch_id,
            current_mark=item.current_mark,
            requested_change=item.requested_change,
            query_type=item.query_type.value
        )
        
        db.add(db_query)
        created_queries.append(db_query)
    
    # If there's an assessment-level note, create a special assessment-wide query
    if batch_query.assessment_level_note:
        assessment_query = MarkQuery(
            student_id=student_id,
            assessment_id=batch_query.assessment_id,
            question_id=None,  # Assessment-wide
            batch_id=batch_id,
            current_mark=None,
            requested_change=batch_query.assessment_level_note,
            query_type="clarification"  # Default for assessment-wide
        )
        db.add(assessment_query)
        created_queries.append(assessment_query)
    
    db.commit()
    
    # Refresh all queries
    for query in created_queries:
        db.refresh(query)
    
    return batch_id, created_queries


def get_mark_query(db: Session, query_id: UUID) -> Optional[MarkQuery]:
    """Get a specific mark query by ID with related data"""
    return db.query(MarkQuery).options(
        joinedload(MarkQuery.student),
        joinedload(MarkQuery.reviewer),
        joinedload(MarkQuery.assessment),
        joinedload(MarkQuery.question)
    ).filter(MarkQuery.id == query_id).first()


def get_student_queries(db: Session, student_id: UUID, skip: int = 0, limit: int = 100) -> List[MarkQuery]:
    """Get all queries for a specific student"""
    return db.query(MarkQuery).options(
        joinedload(MarkQuery.assessment),
        joinedload(MarkQuery.question),
        joinedload(MarkQuery.reviewer)
    ).filter(
        MarkQuery.student_id == student_id
    ).order_by(MarkQuery.created_at.desc()).offset(skip).limit(limit).all()


def get_course_queries(
    db: Session, 
    course_id: UUID, 
    status: Optional[QueryStatus] = None,
    skip: int = 0, 
    limit: int = 100,
    assessment_id: Optional[UUID] = None
) -> List[MarkQuery]:
    """Get all queries for a specific course"""
    query = db.query(MarkQuery).options(
        joinedload(MarkQuery.student),
        joinedload(MarkQuery.assessment),
        joinedload(MarkQuery.question),
        joinedload(MarkQuery.reviewer)
    ).join(Assessment).filter(Assessment.course_id == course_id)
    
    if status:
        query = query.filter(MarkQuery.status == status.value)
    
    if assessment_id:
        query = query.filter(MarkQuery.assessment_id == assessment_id)
        
    return query.order_by(MarkQuery.created_at.desc()).offset(skip).limit(limit).all()


def get_assessment_queries(
    db: Session, 
    assessment_id: UUID, 
    status: Optional[QueryStatus] = None
) -> List[MarkQuery]:
    """Get all queries for a specific assessment"""
    query = db.query(MarkQuery).options(
        joinedload(MarkQuery.student),
        joinedload(MarkQuery.question),
        joinedload(MarkQuery.reviewer)
    ).filter(MarkQuery.assessment_id == assessment_id)
    
    if status:
        query = query.filter(MarkQuery.status == status.value)
        
    return query.order_by(MarkQuery.created_at.desc()).all()


def update_mark_query(
    db: Session, 
    query_id: UUID, 
    update_data: MarkQueryUpdate, 
    reviewer_id: UUID
) -> Optional[MarkQuery]:
    """Update a mark query with reviewer response"""
    db_query = db.query(MarkQuery).filter(MarkQuery.id == query_id).first()
    if not db_query:
        return None
    
    update_dict = update_data.model_dump(exclude_unset=True)
    update_dict['reviewer_id'] = reviewer_id
    update_dict['updated_at'] = datetime.utcnow()
    
    for field, value in update_dict.items():
        setattr(db_query, field, value)
    
    db.commit()
    db.refresh(db_query)
    return db_query


def check_existing_pending_query(
    db: Session, 
    student_id: UUID, 
    assessment_id: UUID, 
    question_id: UUID
) -> bool:
    """Check if student has an existing pending query for this question"""
    existing_query = db.query(MarkQuery).filter(
        and_(
            MarkQuery.student_id == student_id,
            MarkQuery.assessment_id == assessment_id,
            MarkQuery.question_id == question_id,
            MarkQuery.status.in_(['pending', 'under_review'])
        )
    ).first()
    
    return existing_query is not None


def get_query_stats(db: Session, course_id: UUID) -> dict:
    """Get query statistics for a course"""
    base_query = db.query(MarkQuery).join(Assessment).filter(Assessment.course_id == course_id)
    
    total = base_query.count()
    pending = base_query.filter(MarkQuery.status == 'pending').count()
    under_review = base_query.filter(MarkQuery.status == 'under_review').count()
    resolved = base_query.filter(MarkQuery.status.in_(['approved', 'rejected', 'resolved'])).count()
    
    # Get counts by status
    status_counts = {}
    for status in ['pending', 'under_review', 'approved', 'rejected', 'resolved']:
        status_counts[status] = base_query.filter(MarkQuery.status == status).count()
    
    return {
        'total_queries': total,
        'pending_queries': pending + under_review,
        'resolved_queries': resolved,
        'by_status': status_counts
    }


def get_queries_by_batch(db: Session, batch_id: UUID) -> List[MarkQuery]:
    """Get all queries in a specific batch"""
    return db.query(MarkQuery).options(
        joinedload(MarkQuery.student),
        joinedload(MarkQuery.assessment),
        joinedload(MarkQuery.question),
        joinedload(MarkQuery.reviewer)
    ).filter(MarkQuery.batch_id == batch_id).order_by(MarkQuery.created_at).all()


def update_queries_batch(db: Session, updates: List[dict], reviewer_id: UUID) -> List[MarkQuery]:
    """Update multiple queries in batch"""
    updated_queries = []
    
    for update_data in updates:
        query_id = update_data.pop('id')
        db_query = db.query(MarkQuery).filter(MarkQuery.id == query_id).first()
        
        if db_query:
            update_data['reviewer_id'] = reviewer_id
            update_data['updated_at'] = datetime.utcnow()
            
            for field, value in update_data.items():
                setattr(db_query, field, value)
            
            updated_queries.append(db_query)
    
    db.commit()
    
    # Refresh all updated queries
    for query in updated_queries:
        db.refresh(query)
    
    return updated_queries


def get_triage_groups(db: Session, course_id: UUID, status_filter: Optional[List[str]] = None) -> List[dict]:
    """Get grouped queries for lecturer triage view"""
    from sqlalchemy import func
    
    # Base query with joins
    base_query = db.query(MarkQuery).join(Assessment).filter(Assessment.course_id == course_id)
    
    if status_filter:
        base_query = base_query.filter(MarkQuery.status.in_(status_filter))
    
    # Group by batch_id first (for new multi-question submissions)
    batch_groups = db.query(
        MarkQuery.batch_id,
        MarkQuery.student_id,
        MarkQuery.assessment_id,
        func.count(MarkQuery.id).label('question_count'),
        func.array_agg(MarkQuery.query_type).label('query_types'),
        func.string_agg(MarkQuery.requested_change, ' | ').label('combined_requests'),
        func.min(MarkQuery.created_at).label('created_at'),
        func.array_agg(MarkQuery.status).label('statuses')
    ).join(Assessment).filter(
        Assessment.course_id == course_id,
        MarkQuery.batch_id.isnot(None)
    )
    
    if status_filter:
        batch_groups = batch_groups.filter(MarkQuery.status.in_(status_filter))
    
    batch_groups = batch_groups.group_by(
        MarkQuery.batch_id, MarkQuery.student_id, MarkQuery.assessment_id
    ).all()
    
    # Group individual queries (legacy single-question submissions)
    individual_queries = db.query(MarkQuery).options(
        joinedload(MarkQuery.student),
        joinedload(MarkQuery.assessment)
    ).join(Assessment).filter(
        Assessment.course_id == course_id,
        MarkQuery.batch_id.is_(None)
    )
    
    if status_filter:
        individual_queries = individual_queries.filter(MarkQuery.status.in_(status_filter))
    
    individual_queries = individual_queries.all()
    
    # Convert to consistent format
    groups = []
    
    # Add batch groups
    for group in batch_groups:
        # Get student and assessment info
        student = db.query(User).filter(User.id == group.student_id).first()
        assessment = db.query(Assessment).filter(Assessment.id == group.assessment_id).first()
        
        preview_text = group.combined_requests[:120] + "..." if len(group.combined_requests) > 120 else group.combined_requests
        
        # Determine primary status (most urgent)
        status_priority = {'pending': 1, 'under_review': 2, 'approved': 3, 'rejected': 4, 'resolved': 5}
        primary_status = min(group.statuses, key=lambda x: status_priority.get(x, 6))
        
        groups.append({
            'batch_id': group.batch_id,
            'student_id': group.student_id,
            'student_name': f"{student.first_name} {student.last_name}" if student else "Unknown",
            'student_number': getattr(student, 'student_number', None) if student else None,
            'assessment_id': group.assessment_id,
            'assessment_title': assessment.title if assessment else "Unknown",
            'question_count': group.question_count,
            'query_types': list(set(group.query_types)),  # Remove duplicates
            'preview_text': preview_text,
            'created_at': group.created_at,
            'status': primary_status
        })
    
    # Add individual queries as single-item groups
    for query in individual_queries:
        preview_text = query.requested_change[:120] + "..." if len(query.requested_change) > 120 else query.requested_change
        
        groups.append({
            'batch_id': None,
            'student_id': query.student_id,
            'student_name': f"{query.student.first_name} {query.student.last_name}" if query.student else "Unknown",
            'student_number': getattr(query.student, 'student_number', None) if query.student else None,
            'assessment_id': query.assessment_id,
            'assessment_title': query.assessment.title if query.assessment else "Unknown",
            'question_count': 1,
            'query_types': [query.query_type],
            'preview_text': preview_text,
            'created_at': query.created_at,
            'status': query.status
        })
    
    # Sort by created_at
    groups.sort(key=lambda x: x['created_at'])
    
    return groups