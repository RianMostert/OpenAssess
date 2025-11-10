"""
Export service for generating CSV and other export formats.

This service handles all export operations including CSV generation
for assessment results and course rosters.
"""

import csv
from io import StringIO
from collections import defaultdict
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.question_result import QuestionResult
from app.models.user import User


class CSVExportService:
    """Service for generating CSV exports."""
    
    @staticmethod
    def export_assessment_results(
        db: Session,
        assessment_id: UUID
    ) -> StringIO:
        """
        Generate CSV export of assessment results.
        
        Args:
            db: Database session
            assessment_id: ID of the assessment
            
        Returns:
            StringIO buffer containing CSV data
        """
        # Get all questions ordered by question number
        questions = (
            db.query(Question)
            .filter(Question.assessment_id == assessment_id)
            .order_by(Question.question_number)
            .all()
        )
        
        if not questions:
            raise ValueError("No questions found for this assessment")
        
        question_ids = [q.id for q in questions]
        question_labels = [f" {q.question_number}" for q in questions]
        
        # Get all results with user information
        results = (
            db.query(QuestionResult, User)
            .join(User, User.id == QuestionResult.student_id)
            .filter(QuestionResult.assessment_id == assessment_id)
            .all()
        )
        
        if not results:
            raise ValueError("No results found for this assessment")
        
        # Organize results by student
        students = defaultdict(
            lambda: {
                "first_name": "",
                "last_name": "",
                "student_number": "",
                "marks": {qid: None for qid in question_ids},
            }
        )
        
        for result, user in results:
            s = students[user.id]
            s["first_name"] = user.first_name
            s["last_name"] = user.last_name
            s["student_number"] = user.student_number
            s["marks"][result.question_id] = result.mark
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        header = ["student_number", "first_name", "last_name"] + question_labels + ["total"]
        writer.writerow(header)
        
        # Write student rows
        for s in students.values():
            marks = [(s["marks"].get(qid) or 0) for qid in question_ids]
            total = sum(marks)
            row = [s["student_number"], s["first_name"], s["last_name"]] + marks + [total]
            writer.writerow(row)
        
        output.seek(0)
        return output


# Create singleton instance
csv_export_service = CSVExportService()
