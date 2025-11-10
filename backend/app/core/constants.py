"""
Application-wide constants.

This module defines all constant values used throughout the application,
including role IDs, status values, and other magic numbers.
"""


class PrimaryRoles:
    """Primary role IDs for users."""
    ADMINISTRATOR = 1
    STAFF = 2
    STUDENT = 3


class CourseRoles:
    """Course-specific role IDs."""
    CONVENER = 1
    FACILITATOR = 2
    STUDENT = 3


class QueryStatus:
    """Mark query status values."""
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESOLVED = "resolved"


class FileTypes:
    """Allowed file types."""
    PDF = "application/pdf"
    CSV = "text/csv"


class Limits:
    """Application limits and defaults."""
    DEFAULT_PAGE_SIZE = 100
    MAX_PAGE_SIZE = 1000
    MAX_FILE_SIZE_MB = 50
    QUERY_DUPLICATE_WINDOW_MINUTES = 5  # Time window to prevent duplicate queries


class Messages:
    """Standard response messages."""
    
    # Success messages
    CREATED_SUCCESS = "Resource created successfully"
    UPDATED_SUCCESS = "Resource updated successfully"
    DELETED_SUCCESS = "Resource deleted successfully"
    
    # Error messages
    NOT_FOUND = "Resource not found"
    UNAUTHORIZED = "Not authorized to perform this action"
    FORBIDDEN = "Access denied"
    
    # Specific messages
    ASSESSMENT_NOT_FOUND = "Assessment not found"
    COURSE_NOT_FOUND = "Course not found"
    QUESTION_NOT_FOUND = "Question not found"
    USER_NOT_FOUND = "User not found"
    FILE_NOT_FOUND = "File not found"
    
    COURSE_ACCESS_DENIED = "Not authorized to access this course"
    CONVENER_REQUIRED = "Only course conveners can perform this action"
    FACILITATOR_OR_CONVENER_REQUIRED = "Convener or Facilitator role required for this course"
    
    INVALID_FILE_TYPE = "Invalid file type"
    PDF_ONLY = "Only PDF files are allowed"
    CSV_ONLY = "File must be a CSV"
