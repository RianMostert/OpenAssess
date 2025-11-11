/**
 * Assessment Service
 * Handles all assessment-related API calls
 */

import { API_CONFIG } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface CreateAssessmentData {
  course_id: string; // UUID
  title: string;
  total_marks: number;
}

export interface UpdateAssessmentData {
  title?: string;
  total_marks?: number;
  question_paper_file_path?: string;
}

export interface CreateQuestionData {
  assessment_id: string; // UUID
  question_number: number;
  max_marks: number;
  page_number: number;
}

export interface UpdateQuestionData {
  question_number?: number;
  max_marks?: number;
  page_number?: number;
}

export interface QuestionResult {
  id: string; // UUID
  student_id: string; // UUID
  question_id: string; // UUID
  marks: number;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_surname?: string;
  question_number?: number;
  max_marks?: number;
}

export interface StudentResult {
  id: string; // UUID
  student_id: string; // UUID
  assessment_id: string; // UUID
  total_marks: number;
  percentage: number;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_surname?: string;
  student_number?: string;
}

export interface UpdateQuestionResultData {
  marks: number;
}

export interface BulkQuestionResultsData {
  results: Array<{
    student_id: string; // UUID
    question_id: string; // UUID
    marks: number;
  }>;
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
// Assessment Service
// ============================================================================

export const assessmentService = {
  /**
   * Create a new assessment
   */
  async createAssessment(data: CreateAssessmentData): Promise<any> {
    return apiCall<any>('/assessments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an assessment
   */
  async updateAssessment(assessmentId: string, data: UpdateAssessmentData): Promise<any> {
    return apiCall<any>(`/assessments/${assessmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an assessment
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    return apiCall<void>(`/assessments/${assessmentId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Create a question for an assessment
   */
  async createQuestion(data: CreateQuestionData): Promise<any> {
    return apiCall<any>('/questions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a question
   */
  async updateQuestion(questionId: string, data: UpdateQuestionData): Promise<any> {
    return apiCall<any>(`/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    return apiCall<void>(`/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get question results for an assessment
   */
  async getQuestionResults(
    courseId: string,
    assessmentId: string,
    questionId?: string
  ): Promise<QuestionResult[]> {
    const queryString = questionId ? `?question_id=${questionId}` : '';
    return apiCall<QuestionResult[]>(
      `/courses/${courseId}/assessments/${assessmentId}/question-results${queryString}`
    );
  },

  /**
   * Update a question result
   */
  async updateQuestionResult(
    resultId: string,
    data: UpdateQuestionResultData
  ): Promise<QuestionResult> {
    return apiCall<QuestionResult>(`/question-results/${resultId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Bulk update question results
   */
  async bulkUpdateQuestionResults(data: BulkQuestionResultsData): Promise<any> {
    return apiCall<any>('/question-results/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get student results for an assessment
   */
  async getStudentResults(
    courseId: string,
    assessmentId: string
  ): Promise<StudentResult[]> {
    return apiCall<StudentResult[]>(
      `/courses/${courseId}/assessments/${assessmentId}/student-results`
    );
  },

  /**
   * Get a specific student's result
   */
  async getStudentResult(
    courseId: string,
    assessmentId: string,
    studentId: string
  ): Promise<StudentResult> {
    return apiCall<StudentResult>(
      `/courses/${courseId}/assessments/${assessmentId}/students/${studentId}/result`
    );
  },

  /**
   * Get assessment statistics
   */
  async getAssessmentStats(courseId: string, assessmentId: string): Promise<any> {
    return apiCall<any>(`/assessments/${assessmentId}/stats`);
  },

  /**
   * Toggle assessment publish status
   */
  async togglePublishStatus(assessmentId: string, published: boolean): Promise<any> {
    return apiCall<any>(`/assessments/${assessmentId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ published }),
    });
  },

  /**
   * Download assessment results as CSV
   */
  async downloadResultsCSV(assessmentId: string): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/assessments/${assessmentId}/results/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download CSV');
    }

    return response.blob();
  },
};
