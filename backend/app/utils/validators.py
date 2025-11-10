"""
Validation utilities for common entity checks.

This module provides reusable validators that retrieve entities from the database
and raise appropriate HTTPExceptions if they don't exist or access is denied.
"""

from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.course import Course
from app.models.question import Question
from app.models.user import User
from app.models.uploaded_file import UploadedFile
from app.models.mark_query import MarkQuery
from app.core.constants import Messages, PrimaryRoles, CourseRoles


class EntityValidator:
    """Validator for retrieving entities with 404 handling."""
    
    @staticmethod
    def get_assessment_or_404(db: Session, assessment_id: UUID) -> Assessment:
        """Get assessment by ID or raise 404."""
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=Messages.ASSESSMENT_NOT_FOUND
            )
        return assessment
    
    @staticmethod
    def get_course_or_404(db: Session, course_id: UUID) -> Course:
        """Get course by ID or raise 404."""
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=Messages.COURSE_NOT_FOUND
            )
        return course
    
    @staticmethod
    def get_question_or_404(db: Session, question_id: UUID) -> Question:
        """Get question by ID or raise 404."""
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=Messages.QUESTION_NOT_FOUND
            )
        return question
    
    @staticmethod
    def get_user_or_404(db: Session, user_id: UUID) -> User:
        """Get user by ID or raise 404."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=Messages.USER_NOT_FOUND
            )
        return user
    
    @staticmethod
    def get_mark_query_or_404(db: Session, query_id: UUID) -> MarkQuery:
        """Get mark query by ID or raise 404."""
        mark_query = db.query(MarkQuery).filter(MarkQuery.id == query_id).first()
        if not mark_query:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mark query not found"
            )
        return mark_query


class AccessValidator:
    """Validator for checking user access permissions."""
    
    @staticmethod
    def validate_course_access(db: Session, user: User, course_id: UUID) -> None:
        """
        Validate that user has access to a course.
        Raises HTTPException if access is denied.
        """
        # Admins have access to everything
        if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
            return
        
        # Check if user has any role in the course
        from app.models.user_course_role import UserCourseRole
        user_role = (
            db.query(UserCourseRole)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id
            )
            .first()
        )
        
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Messages.COURSE_ACCESS_DENIED
            )
    
    @staticmethod
    def validate_convener_access(db: Session, user: User, course_id: UUID) -> None:
        """
        Validate that user is a course convener.
        Raises HTTPException if not a convener.
        """
        # Admins have access to everything
        if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
            return
        
        # Check if user is convener
        from app.models.user_course_role import UserCourseRole
        convener_role = (
            db.query(UserCourseRole)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                UserCourseRole.course_role_id == CourseRoles.CONVENER
            )
            .first()
        )
        
        if not convener_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Messages.CONVENER_REQUIRED
            )
    
    @staticmethod
    def validate_facilitator_or_convener_access(
        db: Session, user: User, course_id: UUID
    ) -> None:
        """
        Validate that user is a facilitator or convener.
        Raises HTTPException if neither.
        """
        # Admins have access to everything
        if user.primary_role_id == PrimaryRoles.ADMINISTRATOR:
            return
        
        # Check if user is facilitator or convener
        from app.models.user_course_role import UserCourseRole
        role = (
            db.query(UserCourseRole)
            .filter(
                UserCourseRole.user_id == user.id,
                UserCourseRole.course_id == course_id,
                UserCourseRole.course_role_id.in_([
                    CourseRoles.CONVENER,
                    CourseRoles.FACILITATOR
                ])
            )
            .first()
        )
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Messages.FACILITATOR_OR_CONVENER_REQUIRED
            )
    
    @staticmethod
    def validate_assessment_access(
        db: Session, user: User, assessment: Assessment
    ) -> None:
        """
        Validate that user has access to an assessment through its course.
        Raises HTTPException if access is denied.
        """
        AccessValidator.validate_course_access(db, user, assessment.course_id)


class FileValidator:
    """Validator for file upload operations."""
    
    @staticmethod
    def validate_pdf_file(filename: str) -> None:
        """Validate that file is a PDF."""
        if not filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Messages.PDF_ONLY
            )
    
    @staticmethod
    def validate_csv_file(content_type: str) -> None:
        """Validate that file is a CSV."""
        if content_type != "text/csv":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Messages.CSV_ONLY
            )
