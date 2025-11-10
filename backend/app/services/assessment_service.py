"""
Assessment service for handling assessment business logic.

This service contains all complex business logic related to assessments,
including statistics calculations, grading status, and performance metrics.
"""

from collections import defaultdict
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.assessment import Assessment
from app.models.question import Question
from app.models.question_result import QuestionResult
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.core.constants import Limits


class AssessmentStatsService:
    """Service for calculating assessment statistics and analytics."""
    
    @staticmethod
    def calculate_assessment_stats(
        db: Session,
        assessment_id: UUID
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive statistics for an assessment.
        
        Args:
            db: Database session
            assessment_id: ID of the assessment
            
        Returns:
            Dictionary containing grading completion, grade distribution,
            and question performance statistics
        """
        # Get all questions for this assessment
        questions = (
            db.query(Question)
            .filter(Question.assessment_id == assessment_id)
            .order_by(Question.question_number)
            .all()
        )
        
        if not questions:
            return AssessmentStatsService._get_empty_stats()
        
        # Get all students who submitted
        submitted_students = (
            db.query(UploadedFile.student_id)
            .filter(UploadedFile.assessment_id == assessment_id)
            .distinct()
            .all()
        )
        submitted_student_ids = [s.student_id for s in submitted_students]
        total_submissions = len(submitted_student_ids)
        
        if total_submissions == 0:
            return AssessmentStatsService._get_empty_stats()
        
        # Calculate grading completion
        grading_completion = AssessmentStatsService._calculate_grading_completion(
            db, assessment_id, submitted_student_ids, questions
        )
        
        # Calculate grade distribution
        grade_distribution = AssessmentStatsService._calculate_grade_distribution(
            db, assessment_id, grading_completion['graded_student_ids'], questions
        )
        
        # Calculate question performance
        question_performance = AssessmentStatsService._calculate_question_performance(
            db, assessment_id, submitted_student_ids, questions, total_submissions
        )
        
        return {
            "grading_completion": grading_completion['stats'],
            "grade_distribution": grade_distribution,
            "question_performance": question_performance
        }
    
    @staticmethod
    def _get_empty_stats() -> Dict[str, Any]:
        """Return empty statistics structure."""
        return {
            "grading_completion": {
                "total_submissions": 0,
                "graded_submissions": 0,
                "ungraded_submissions": 0,
                "completion_percentage": 0
            },
            "grade_distribution": {
                "average_score": 0,
                "median_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "score_ranges": []
            },
            "question_performance": []
        }
    
    @staticmethod
    def _calculate_grading_completion(
        db: Session,
        assessment_id: UUID,
        submitted_student_ids: List[UUID],
        questions: List[Question]
    ) -> Dict[str, Any]:
        """Calculate grading completion statistics."""
        total_submissions = len(submitted_student_ids)
        
        # Find students who have all questions graded
        fully_graded_students = (
            db.query(QuestionResult.student_id)
            .filter(
                QuestionResult.assessment_id == assessment_id,
                QuestionResult.mark.isnot(None),
                QuestionResult.student_id.in_(submitted_student_ids)
            )
            .group_by(QuestionResult.student_id)
            .having(func.count(QuestionResult.question_id) == len(questions))
            .all()
        )
        
        fully_graded_student_ids = [s.student_id for s in fully_graded_students]
        graded_submissions = len(fully_graded_student_ids)
        ungraded_submissions = total_submissions - graded_submissions
        completion_percentage = (
            (graded_submissions / total_submissions * 100)
            if total_submissions > 0 else 0
        )
        
        return {
            'stats': {
                "total_submissions": total_submissions,
                "graded_submissions": graded_submissions,
                "ungraded_submissions": ungraded_submissions,
                "completion_percentage": round(completion_percentage, 1)
            },
            'graded_student_ids': fully_graded_student_ids
        }
    
    @staticmethod
    def _calculate_grade_distribution(
        db: Session,
        assessment_id: UUID,
        graded_student_ids: List[UUID],
        questions: List[Question]
    ) -> Dict[str, Any]:
        """Calculate grade distribution statistics."""
        if not graded_student_ids:
            return {
                "average_score": 0,
                "median_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "score_ranges": []
            }
        
        # Calculate total possible marks
        total_possible = sum(q.max_marks for q in questions)
        
        # Get student scores as percentages
        student_scores = []
        for student_id in graded_student_ids:
            student_total = (
                db.query(func.sum(QuestionResult.mark))
                .filter(
                    QuestionResult.assessment_id == assessment_id,
                    QuestionResult.student_id == student_id,
                    QuestionResult.mark.isnot(None)
                )
                .scalar()
            ) or 0
            
            if total_possible > 0:
                percentage = (student_total / total_possible) * 100
                student_scores.append(percentage)
        
        if not student_scores:
            return {
                "average_score": 0,
                "median_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "score_ranges": []
            }
        
        # Calculate statistics
        average_score = sum(student_scores) / len(student_scores)
        sorted_scores = sorted(student_scores)
        median_score = (
            sorted_scores[len(sorted_scores) // 2]
            if len(sorted_scores) % 2 == 1
            else (sorted_scores[len(sorted_scores) // 2 - 1] + sorted_scores[len(sorted_scores) // 2]) / 2
        )
        highest_score = max(student_scores)
        lowest_score = min(student_scores)
        
        # Create score ranges
        score_ranges = AssessmentStatsService._create_score_ranges(student_scores)
        
        return {
            "average_score": round(average_score, 1),
            "median_score": round(median_score, 1),
            "highest_score": round(highest_score, 1),
            "lowest_score": round(lowest_score, 1),
            "score_ranges": score_ranges
        }
    
    @staticmethod
    def _create_score_ranges(student_scores: List[float]) -> List[Dict[str, Any]]:
        """Create score range distribution (0-39, 40-49, etc.)."""
        score_ranges = [
            {"range": "0-39", "count": 0},
            {"range": "40-49", "count": 0},
            {"range": "50-59", "count": 0},
            {"range": "60-69", "count": 0},
            {"range": "70-79", "count": 0},
            {"range": "80-89", "count": 0},
            {"range": "90-100", "count": 0}
        ]
        
        for score in student_scores:
            if score < 40:
                score_ranges[0]["count"] += 1
            elif score < 50:
                score_ranges[1]["count"] += 1
            elif score < 60:
                score_ranges[2]["count"] += 1
            elif score < 70:
                score_ranges[3]["count"] += 1
            elif score < 80:
                score_ranges[4]["count"] += 1
            elif score < 90:
                score_ranges[5]["count"] += 1
            else:
                score_ranges[6]["count"] += 1
        
        return score_ranges
    
    @staticmethod
    def _calculate_question_performance(
        db: Session,
        assessment_id: UUID,
        submitted_student_ids: List[UUID],
        questions: List[Question],
        total_submissions: int
    ) -> List[Dict[str, Any]]:
        """Calculate performance statistics for each question."""
        question_performance = []
        
        for question in questions:
            # Get all graded results for this question
            question_results = (
                db.query(QuestionResult)
                .filter(
                    QuestionResult.assessment_id == assessment_id,
                    QuestionResult.question_id == question.id,
                    QuestionResult.student_id.in_(submitted_student_ids),
                    QuestionResult.mark.isnot(None)
                )
                .all()
            )
            
            graded_count = len(question_results)
            ungraded_count = total_submissions - graded_count
            
            if question_results:
                marks = [qr.mark for qr in question_results]
                avg_mark = sum(marks) / len(marks)
                max_mark = max(marks)
                min_mark = min(marks)
                avg_percentage = (
                    (avg_mark / question.max_marks * 100)
                    if question.max_marks > 0 else 0
                )
            else:
                avg_mark = max_mark = min_mark = avg_percentage = 0
            
            question_performance.append({
                "question_number": question.question_number,
                "question_title": question.question_number or f"Question {question.id}",
                "max_marks": question.max_marks,
                "graded_count": graded_count,
                "ungraded_count": ungraded_count,
                "average_mark": round(avg_mark, 2) if avg_mark else 0,
                "average_percentage": round(avg_percentage, 1) if avg_percentage else 0,
                "highest_mark": max_mark if max_mark else 0,
                "lowest_mark": min_mark if min_mark else 0
            })
        
        return question_performance


class AssessmentService:
    """Service for assessment business operations."""
    
    def __init__(self):
        """Initialize assessment service."""
        self.stats_service = AssessmentStatsService()
    
    def get_assessment_with_stats(
        self,
        db: Session,
        assessment_id: UUID
    ) -> Dict[str, Any]:
        """
        Get assessment details along with statistics.
        
        Args:
            db: Database session
            assessment_id: ID of the assessment
            
        Returns:
            Assessment with statistics
        """
        stats = self.stats_service.calculate_assessment_stats(db, assessment_id)
        return stats


# Create singleton instance
assessment_service = AssessmentService()
