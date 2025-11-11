/**
 * Export Service
 * Handles data export operations (CSV downloads, PDF generation, etc.)
 */

import { API_CONFIG } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface ExportParams {
  courseId: number;
  assessmentId: number;
  format?: 'csv' | 'pdf';
}

export interface AnnotatedPdfParams {
  courseId: number;
  assessmentId: number;
  studentId: number;
}

// ============================================================================
// Export Service
// ============================================================================

export const exportService = {
  /**
   * Export assessment results to CSV
   */
  async exportResultsCsv(courseId: number, assessmentId: number): Promise<void> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/courses/${courseId}/assessments/${assessmentId}/export/csv`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Export failed: ${response.statusText}`);
    }

    // Download the CSV file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment_${assessmentId}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export facilitator assignments to CSV
   */
  async exportFacilitatorsCsv(courseId: number, assessmentId: number): Promise<void> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/courses/${courseId}/assessments/${assessmentId}/export/facilitators`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Export failed: ${response.statusText}`);
    }

    // Download the CSV file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment_${assessmentId}_facilitators.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Get annotated PDF for a student's submission
   */
  async getAnnotatedPdf(params: AnnotatedPdfParams): Promise<string> {
    const { courseId, assessmentId, studentId } = params;
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/courses/${courseId}/assessments/${assessmentId}/students/${studentId}/annotated-pdf`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to get annotated PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Download annotated PDF for a student's submission
   */
  async downloadAnnotatedPdf(params: AnnotatedPdfParams): Promise<void> {
    const { courseId, assessmentId, studentId } = params;
    const url = await this.getAnnotatedPdf(params);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_${studentId}_assessment_${assessmentId}_annotated.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Bulk export all student PDFs with annotations
   */
  async exportAllAnnotatedPdfs(courseId: number, assessmentId: number): Promise<void> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/courses/${courseId}/assessments/${assessmentId}/export/all-pdfs`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Bulk export failed: ${response.statusText}`);
    }

    // Download the ZIP file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment_${assessmentId}_all_annotated_pdfs.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export annotated PDFs for an assessment (POST endpoint)
   */
  async exportAnnotatedPdfs(courseId: string, assessmentId: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/export/annotated-pdfs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        course_id: courseId,
        assessment_id: assessmentId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Export failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotated_pdfs_course_${courseId}_assessment_${assessmentId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
