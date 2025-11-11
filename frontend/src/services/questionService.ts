/**
 * Question Service
 * Handles all question-related API calls for assessments
 */

import { API_CONFIG } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface MappingQuestion {
  id: string;
  assessment_id: string;
  question_number: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  max_marks?: number;
  increment?: number;
  memo?: string;
  marking_note?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMappingQuestionData {
  assessment_id: string;
  question_number: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  max_marks?: number;
  increment?: number;
  memo?: string;
  marking_note?: string;
}

export interface UpdateMappingQuestionData {
  question_number?: string;
  page_number?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  max_marks?: number;
  increment?: number;
  memo?: string;
  marking_note?: string;
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API call failed: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Question Service Methods
// ============================================================================

/**
 * Get all questions for an assessment
 */
export async function getAssessmentQuestions(assessmentId: string): Promise<MappingQuestion[]> {
  return apiCall<MappingQuestion[]>(`/assessments/${assessmentId}/questions`);
}

/**
 * Create a new question
 */
export async function createQuestion(data: CreateMappingQuestionData): Promise<MappingQuestion> {
  return apiCall<MappingQuestion>('/questions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing question
 */
export async function updateQuestion(
  questionId: string,
  data: UpdateMappingQuestionData
): Promise<MappingQuestion> {
  return apiCall<MappingQuestion>(`/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_CONFIG.BASE_URL}/questions/${questionId}`, {
    method: 'DELETE',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete question');
  }
}

/**
 * Get the question paper PDF for an assessment
 * Returns a blob URL that can be used directly
 */
export async function getQuestionPaper(assessmentId: string): Promise<string> {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/assessments/${assessmentId}/question-paper`,
    {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to load question paper PDF');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ============================================================================
// Service Object Export (for convenience)
// ============================================================================

export const questionService = {
  getAssessmentQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionPaper,
};
