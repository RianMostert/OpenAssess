from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class QueryStatus(str, Enum):
    pending = "pending"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"


class QueryType(str, Enum):
    regrade = "regrade"
    clarification = "clarification"
    technical_issue = "technical_issue"


# Individual question item for multi-question submissions
class QuestionItem(BaseModel):
    question_id: Optional[UUID] = Field(None, description="Question ID to query (null for assessment-wide issues)")
    current_mark: Optional[float] = Field(None, description="Current mark for the question")
    requested_change: str = Field(..., min_length=10, max_length=1000)
    query_type: QueryType = Field(default=QueryType.regrade, description="Type of query")


# New multi-question batch submission schema
class MarkQueryBatchCreate(BaseModel):
    assessment_id: UUID
    question_items: List[QuestionItem] = Field(..., min_items=1, max_items=10, description="Questions to query")
    assessment_level_note: Optional[str] = Field(None, max_length=500, description="Optional assessment-wide context")


# Response for batch creation
class MarkQueryBatchResponse(BaseModel):
    batch_id: UUID
    query_ids: List[UUID]
    created_count: int


# Existing schemas for backward compatibility
class MarkQueryCreate(BaseModel):
    assessment_id: UUID
    question_id: UUID = Field(..., description="Question ID to query")
    requested_change: str = Field(..., min_length=10, max_length=1000)
    query_type: QueryType = Field(default=QueryType.regrade, description="Type of query")
    current_mark: Optional[float] = Field(None, description="Current mark for the question")


class MarkQueryUpdate(BaseModel):
    status: Optional[QueryStatus] = None
    reviewer_response: Optional[str] = Field(None, max_length=1000)
    new_mark: Optional[float] = None


class MarkQueryResponse(BaseModel):
    status: QueryStatus
    reviewer_response: str = Field(..., min_length=1, max_length=1000)
    new_mark: Optional[float] = None


class MarkQueryOut(BaseModel):
    id: UUID
    student_id: UUID
    assessment_id: UUID
    question_id: Optional[UUID]
    batch_id: Optional[UUID]
    current_mark: Optional[float]
    requested_change: str
    query_type: str
    status: QueryStatus
    reviewer_id: Optional[UUID]
    reviewer_response: Optional[str]
    new_mark: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Additional computed fields
    student_name: Optional[str] = None
    student_number: Optional[str] = None
    assessment_title: Optional[str] = None
    question_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Schemas for lecturer triage view
class QueryGroup(BaseModel):
    batch_id: Optional[UUID] = Field(None, description="Batch ID for grouped queries")
    student_id: UUID
    student_name: str
    student_number: Optional[str]
    assessment_id: UUID
    assessment_title: str
    question_count: int
    query_types: List[str] = Field(..., description="Types of queries in this group")
    preview_text: str = Field(..., description="Preview of requested changes")
    created_at: datetime
    status: QueryStatus = Field(..., description="Primary status of the group")
    

class TriageResponse(BaseModel):
    groups: List[QueryGroup]
    total_groups: int
    stats: 'MarkQueryStats'


# Bulk operation schemas
class BulkStatusUpdate(BaseModel):
    query_ids: List[UUID]
    status: QueryStatus
    reviewer_id: Optional[UUID] = None


class BulkQueryUpdate(BaseModel):
    updates: List['MarkQueryUpdate']
    
    
# Bulk review for workbench
class QueryReview(BaseModel):
    id: UUID
    reviewer_response: str = Field(..., min_length=1, max_length=1000)
    new_mark: Optional[float] = None
    status: QueryStatus


class BulkReviewSubmission(BaseModel):
    reviews: List[QueryReview]


# Grade commit schema
class GradeCommitRequest(BaseModel):
    query_ids: List[UUID] = Field(..., min_items=1, description="Query IDs to commit to gradebook")


class GradeCommitResponse(BaseModel):
    committed_count: int
    failed_count: int
    committed_query_ids: List[UUID]
    failed_query_ids: List[UUID]
    errors: List[str] = Field(default_factory=list)


class MarkQueryStats(BaseModel):
    total_queries: int
    pending_queries: int
    resolved_queries: int
    by_status: dict[QueryStatus, int]