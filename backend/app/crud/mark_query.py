from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.models.mark_query import MarkQuery
from app.models.assessment import Assessment
from app.schemas.mark_query import MarkQueryCreate, MarkQueryUpdate, QueryStatus


def create_mark_query(db: Session, query: MarkQueryCreate, student_id: UUID) -> MarkQuery:
    """Create a new mark query"""
    db_query = MarkQuery(
        student_id=student_id,
        **query.model_dump()
    )
    db.add(db_query)
    db.commit()
    db.refresh(db_query)
    return db_query


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
    limit: int = 100
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
    question_id: Optional[UUID] = None
) -> bool:
    """Check if student has an existing pending query for this assessment/question"""
    query = db.query(MarkQuery).filter(
        and_(
            MarkQuery.student_id == student_id,
            MarkQuery.assessment_id == assessment_id,
            MarkQuery.status.in_(['pending', 'under_review'])
        )
    )
    
    if question_id:
        query = query.filter(MarkQuery.question_id == question_id)
    else:
        query = query.filter(MarkQuery.question_id.is_(None))
    
    return query.first() is not None


def get_query_stats(db: Session, course_id: UUID) -> dict:
    """Get query statistics for a course"""
    base_query = db.query(MarkQuery).join(Assessment).filter(Assessment.course_id == course_id)
    
    total = base_query.count()
    pending = base_query.filter(MarkQuery.status == 'pending').count()
    under_review = base_query.filter(MarkQuery.status == 'under_review').count()
    resolved = base_query.filter(MarkQuery.status.in_(['approved', 'rejected', 'resolved'])).count()
    
    # Get counts by type
    type_counts = {}
    for query_type in ['regrade', 'clarification', 'technical_issue']:
        type_counts[query_type] = base_query.filter(MarkQuery.query_type == query_type).count()
    
    # Get counts by status
    status_counts = {}
    for status in ['pending', 'under_review', 'approved', 'rejected', 'resolved']:
        status_counts[status] = base_query.filter(MarkQuery.status == status).count()
    
    return {
        'total_queries': total,
        'pending_queries': pending + under_review,
        'resolved_queries': resolved,
        'by_type': type_counts,
        'by_status': status_counts
    }