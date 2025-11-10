"""
File storage service for handling file uploads and storage.

This service manages all file operations including saving, retrieving,
and deleting files for assessments and student submissions.
"""

import os
import shutil
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4
from fastapi import UploadFile

from app.core.config import settings


class FileStorageService:
    """Service for managing file storage operations."""
    
    def __init__(self):
        """Initialize file storage service with configured paths."""
        self.question_paper_path = settings.QUESTION_PAPER_STORAGE_FOLDER
        self.answer_sheet_path = settings.ANSWER_SHEET_STORAGE_FOLDER
        
        # Ensure storage directories exist
        self.question_paper_path.mkdir(parents=True, exist_ok=True)
        self.answer_sheet_path.mkdir(parents=True, exist_ok=True)
    
    def save_question_paper(
        self,
        file: UploadFile,
        course_id: UUID,
        assessment_id: UUID
    ) -> Path:
        """
        Save a question paper PDF file.
        
        Args:
            file: The uploaded file object
            course_id: ID of the course
            assessment_id: ID of the assessment
            
        Returns:
            Path to the saved file
        """
        # Create directory structure: storage/pdfs/question_papers/{course_id}/{assessment_id}/
        destination_dir = self.question_paper_path / str(course_id) / str(assessment_id)
        destination_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_path = destination_dir / f"{uuid4()}_{file.filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Question paper saved: {file_path}")
        return file_path
    
    def save_answer_sheet(
        self,
        file: UploadFile,
        student_id: UUID,
        assessment_id: UUID,
        course_id: Optional[UUID] = None
    ) -> Path:
        """
        Save a student answer sheet PDF file.
        
        Args:
            file: The uploaded file object
            student_id: ID of the student
            assessment_id: ID of the assessment
            course_id: Optional course ID for organizing files
            
        Returns:
            Path to the saved file
        """
        # Create directory structure
        if course_id:
            destination_dir = self.answer_sheet_path / str(course_id) / str(assessment_id)
        else:
            destination_dir = self.answer_sheet_path / str(assessment_id)
        
        destination_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with student ID
        file_path = destination_dir / f"{student_id}_{uuid4()}_{file.filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Answer sheet saved: {file_path}")
        return file_path
    
    def delete_file(self, file_path: Path) -> bool:
        """
        Safely delete a file.
        
        Args:
            file_path: Path to the file to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            if file_path.exists():
                file_path.unlink()
                print(f"File deleted: {file_path}")
                return True
            else:
                print(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            return False
    
    def get_file_path(self, path_string: str) -> Path:
        """
        Convert a path string to a Path object.
        
        Args:
            path_string: String representation of the path
            
        Returns:
            Path object
        """
        return Path(path_string)
    
    def file_exists(self, file_path: Path) -> bool:
        """
        Check if a file exists.
        
        Args:
            file_path: Path to check
            
        Returns:
            True if file exists, False otherwise
        """
        return file_path.exists()


# Create a singleton instance
file_storage_service = FileStorageService()
