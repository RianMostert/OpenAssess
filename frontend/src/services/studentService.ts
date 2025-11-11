/**
 * Student Service
 * Handles all student-specific API calls (results, courses, queries, etc.)
 */

import { API_CONFIG } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface StudentCourse {
  id: string;
  title: string;
  code: string;
  teacher_name: string;
  my_role: string;
  created_at: string;
}

export interface StudentAssessment {
  assessment_id: string;
  title: string;
  upload_date: string;
  status: 'not_submitted' | 'submitted_pending' | 'marked' | 'partially_marked';
  total_marks: number | null;
  total_possible_marks: number;
  percentage: number | null;
  uploaded_file_id: string | null;
  question_count: number;
  has_annotated_pdf: boolean;
}

export interface StudentAssessmentResult {
  assessment_id: string;
  assessment_title: string;
  course_title: string;
  total_marks: number;
  my_marks: number;
  percentage: number;
  questions: Array<{
    question_number: number;
    max_marks: number;
    my_marks: number;
    percentage: number;
  }>;
}

export interface StudentMarkQuery {
  id: string;
  assessment_id: string;
  question_id: string;
  student_id: string;
  query_text: string;
  status: string;
  response_text?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupedQuery {
  id: string;
  batch_id?: string;
  assessment_id: string;
  assessment_title: string;
  question_count: number;
  query_types: string[];
  combined_requests: string;
  created_at: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
  query_ids: string[];
  is_batch: boolean;
  question_number?: string;
}

// ============================================================================
// API Helper
// ============================================================================

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Student Service
// ============================================================================

export const studentService = {
  /**
   * Get all courses for the current student
   */
  async getMyCourses(): Promise<StudentCourse[]> {
    return apiCall<StudentCourse[]>('/student-results/my-courses');
  },

  /**
   * Get all assessments for a specific course
   */
  async getCourseAssessments(courseId: string): Promise<StudentAssessment[]> {
    return apiCall<StudentAssessment[]>(`/student-results/courses/${courseId}/my-assessments`);
  },

  /**
   * Get detailed results for a specific assessment
   */
  async getAssessmentResults(assessmentId: string): Promise<StudentAssessmentResult> {
    return apiCall<StudentAssessmentResult>(`/student-results/assessments/${assessmentId}/my-results`);
  },

  /**
   * Get all queries for the current student (grouped by assessment)
   */
  async getMyQueriesGrouped(): Promise<GroupedQuery[]> {
    return apiCall<GroupedQuery[]>('/student-queries/my-queries-grouped');
  },

  /**
   * Get all queries for the current student (flat list)
   */
  async getMyQueries(): Promise<StudentMarkQuery[]> {
    return apiCall<StudentMarkQuery[]>('/student-queries/my-queries');
  },

  /**
   * Submit a new query
   */
  async submitQuery(data: {
    assessment_id: string;
    question_id: string;
    query_text: string;
  }): Promise<StudentMarkQuery> {
    return apiCall<StudentMarkQuery>('/student-queries/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit batch queries
   */
  async submitBatchQueries(queries: Array<{
    assessment_id: string;
    question_id: string;
    query_text: string;
  }>): Promise<any> {
    return apiCall<any>('/student-queries/batch', {
      method: 'POST',
      body: JSON.stringify({ queries }),
    });
  },

  /**
   * Download annotated PDF for an assessment
   */
  async downloadAnnotatedPdf(assessmentId: string): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/student-results/assessments/${assessmentId}/download-annotated-pdf`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download annotated PDF');
    }

    return response.blob();
  },

  /**
   * Get annotated PDF URL for viewing
   */
  async getAnnotatedPdfUrl(assessmentId: string): Promise<string> {
    const blob = await this.downloadAnnotatedPdf(assessmentId);
    return URL.createObjectURL(blob);
  },
};
