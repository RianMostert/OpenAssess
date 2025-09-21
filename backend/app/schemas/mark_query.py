from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class QueryType(str, Enum):
    regrade = "regrade"
    clarification = "clarification" 
    technical_issue = "technical_issue"


class QueryStatus(str, Enum):
    pending = "pending"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"


class MarkQueryCreate(BaseModel):
    assessment_id: UUID
    question_id: Optional[UUID] = None  # None for full assessment query
    current_mark: Optional[float] = None
    requested_change: str = Field(..., min_length=10, max_length=1000)
    query_type: QueryType


class MarkQueryUpdate(BaseModel):
    status: Optional[QueryStatus] = None
    reviewer_response: Optional[str] = Field(None, max_length=1000)
    new_mark: Optional[float] = None


class MarkQueryResponse(BaseModel):
    status: QueryStatus
    reviewer_response: str = Field(..., min_length=10, max_length=1000)
    new_mark: Optional[float] = None


class MarkQueryOut(BaseModel):
    id: UUID
    student_id: UUID
    assessment_id: UUID
    question_id: Optional[UUID]
    current_mark: Optional[float]
    requested_change: str
    query_type: QueryType
    status: QueryStatus
    reviewer_id: Optional[UUID]
    reviewer_response: Optional[str]
    new_mark: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Additional computed fields
    student_name: Optional[str] = None
    assessment_title: Optional[str] = None
    question_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MarkQueryStats(BaseModel):
    total_queries: int
    pending_queries: int
    resolved_queries: int
    by_type: dict[QueryType, int]
    by_status: dict[QueryStatus, int]