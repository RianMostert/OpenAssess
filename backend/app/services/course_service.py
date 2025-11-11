"""
Course service for handling course business logic.

This service contains complex business logic related to courses,
including statistics, user management, and bulk operations.
"""

from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.course import Course
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.question_result import QuestionResult
from app.models.uploaded_file import UploadedFile
from app.models.user_course_role import UserCourseRole
from app.models.mark_query import MarkQuery
from app.core.constants import CourseRoles


class CourseStatsService:
    """Service for calculating course statistics."""
    
    @staticmethod
    def calculate_course_stats(
        db: Session,
        course_id: UUID
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive statistics for a course.
        
        Args:
            db: Database session
            course_id: ID of the course
            
        Returns:
            Dictionary containing course statistics including student count,
            average performance, and assessment details
        """
        # Get total students in the course
        total_students = (
            db.query(UserCourseRole)
            .filter(UserCourseRole.course_id == course_id)
            .filter(UserCourseRole.course_role_id == CourseRoles.STUDENT)
            .count()
        )
        
        # Get all assessments for the course
        assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
        
        assessment_stats = []
        total_scores = []
        
        for assessment in assessments:
            stats = CourseStatsService._calculate_assessment_stats_for_course(
                db, assessment
            )
            assessment_stats.append(stats)
            
            # Collect scores for overall average
            if stats['averageScore'] > 0:
                total_scores.append(stats['averageScore'])
        
        # Calculate overall average performance
        average_performance = (
            sum(total_scores) / len(total_scores)
            if total_scores else 0.0
        )
        
        return {
            "totalStudents": total_students,
            "averagePerformance": average_performance,
            "assessments": assessment_stats,
        }
    
    @staticmethod
    def _calculate_assessment_stats_for_course(
        db: Session,
        assessment: Assessment
    ) -> Dict[str, Any]:
        """Calculate statistics for a single assessment within course context."""
        # Get total questions
        total_questions = (
            db.query(Question)
            .filter(Question.assessment_id == assessment.id)
            .count()
        )
        
        # Get submission count
        submission_count = (
            db.query(UploadedFile.student_id)
            .filter(UploadedFile.assessment_id == assessment.id)
            .distinct()
            .count()
        )
        
        # Get questions marked count
        questions_marked = (
            db.query(QuestionResult)
            .filter(QuestionResult.assessment_id == assessment.id)
            .filter(QuestionResult.mark.isnot(None))
            .count()
        )
        
        # Get students completely marked
        students_completely_marked = 0
        if total_questions > 0 and submission_count > 0:
            students_with_all_marks = (
                db.query(QuestionResult.student_id)
                .filter(QuestionResult.assessment_id == assessment.id)
                .filter(QuestionResult.mark.isnot(None))
                .group_by(QuestionResult.student_id)
                .having(func.count(QuestionResult.question_id) == total_questions)
                .count()
            )
            students_completely_marked = students_with_all_marks
        
        # Calculate total possible marks
        total_possible = (
            db.query(func.sum(Question.max_marks))
            .filter(Question.assessment_id == assessment.id)
            .scalar()
        ) or 0
        
        # Calculate average score by student totals
        # Get sum of marks per student, then average those sums
        if total_possible > 0 and submission_count > 0:
            student_totals = (
                db.query(
                    QuestionResult.student_id,
                    func.sum(QuestionResult.mark).label('total_marks')
                )
                .filter(QuestionResult.assessment_id == assessment.id)
                .filter(QuestionResult.mark.isnot(None))
                .group_by(QuestionResult.student_id)
                .subquery()
            )
            
            avg_student_total = (
                db.query(func.avg(student_totals.c.total_marks))
                .scalar()
            )
            
            avg_percentage = (float(avg_student_total) / total_possible * 100) if avg_student_total else 0.0
        else:
            avg_percentage = 0.0
        
        # Get pending query count
        query_count = (
            db.query(MarkQuery)
            .filter(MarkQuery.assessment_id == assessment.id)
            .filter(MarkQuery.status == 'pending')
            .count()
        )
        
        return {
            "id": str(assessment.id),
            "title": assessment.title,
            "published": assessment.published,
            "totalQuestions": total_questions,
            "totalStudents": submission_count,
            "questionsMarked": questions_marked,
            "questionsCompletelyMarked": students_completely_marked,
            "averageScore": avg_percentage,
            "submissionCount": submission_count,
            "queryCount": query_count,
        }


class CourseBulkOperationService:
    """Service for handling bulk course operations."""
    
    @staticmethod
    def validate_bulk_upload_row(
        row: Dict[str, str],
        row_num: int
    ) -> Dict[str, Any]:
        """
        Validate a single row from bulk upload CSV.
        
        Args:
            row: Dictionary containing row data
            row_num: Row number for error reporting
            
        Returns:
            Dictionary with validation result
        """
        email = row.get("email", "").strip()
        if not email:
            return {
                "valid": False,
                "error": f"Row {row_num}: Email is required"
            }
        
        first_name = row.get("first_name", "").strip()
        last_name = row.get("last_name", "").strip()
        student_number = row.get("student_number", "").strip() or None
        
        return {
            "valid": True,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "student_number": student_number
        }


class CourseService:
    """Main service for course operations."""
    
    def __init__(self):
        """Initialize course service."""
        self.stats_service = CourseStatsService()
        self.bulk_service = CourseBulkOperationService()
    
    def get_course_statistics(
        self,
        db: Session,
        course_id: UUID
    ) -> Dict[str, Any]:
        """
        Get comprehensive course statistics.
        
        Args:
            db: Database session
            course_id: ID of the course
            
        Returns:
            Course statistics
        """
        return self.stats_service.calculate_course_stats(db, course_id)


# Create singleton instance
course_service = CourseService()
