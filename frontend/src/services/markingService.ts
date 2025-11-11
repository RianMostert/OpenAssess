/**
 * Marking Service
 * Handles all marking/grading-related API calls
 */

import { API_CONFIG } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface UploadedAnswer {
  id: string;
  student_id: string;
  assessment_id: string;
  student_number?: string;
  student_name?: string;
  uploaded_at: string;
}

export interface MarkingQuestionResult {
  id: string;
  question_id: string;
  student_id: string;
  assessment_id: string;
  mark: number | null;
  comment?: string;
  annotation?: AnnotationData;
  created_at: string;
  updated_at: string;
}

export interface AnnotationData {
  page: number;
  lines: Line[];
  texts: TextAnnotation[];
  stickyNotes: StickyNote[];
}

export interface Line {
  points: number[];
  color: string;
  width: number;
  tool?: 'pencil' | 'fine-eraser'; // Optional for backward compatibility
  globalCompositeOperation?: 'source-over' | 'destination-out'; // Optional for backward compatibility
}

export interface TextAnnotation {
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface StickyNote {
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface QuestionWithResult {
    id: string;
    question_number: string;
    max_marks?: number;
    increment?: number;
    memo?: string;
    marking_note?: string;
    page_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
    mark?: number;
    comment?: string;
    annotation?: any;
    result_id?: string;
    updated_at?: string;
}export interface StudentAllResults {
  student_id: string;
  assessment_id: string;
  questions: QuestionWithResult[];
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
// Marking Service Methods
// ============================================================================

/**
 * Get all answer sheets for an assessment
 */
export async function getAnswerSheets(assessmentId: string): Promise<UploadedAnswer[]> {
  return apiCall<UploadedAnswer[]>(`/assessments/${assessmentId}/answer-sheets`);
}

/**
 * Get answer sheet PDF for a specific upload
 * Returns a blob URL that can be used directly
 */
export async function getAnswerSheetPdf(uploadedFileId: string): Promise<string> {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/uploaded-files/${uploadedFileId}/answer-sheet`,
    {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to load answer sheet PDF');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Get question result for a specific question and student
 * If the result doesn't exist, returns a new result object with null values
 */
export async function getQuestionResult(
  assessmentId: string,
  questionId: string,
  studentId: string
): Promise<MarkingQuestionResult> {
  try {
    return await apiCall<MarkingQuestionResult>(
      `/question-results?assessment_id=${assessmentId}&question_id=${questionId}&student_id=${studentId}`
    );
  } catch (error) {
    // If question result doesn't exist (404), return a new empty result
    // This happens when a question hasn't been marked yet
    console.log('Question result not found, creating new empty result');
    return {
      id: '', // Will be created when first saved
      question_id: questionId,
      student_id: studentId,
      assessment_id: assessmentId,
      mark: null,
      comment: undefined,
      annotation: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Get annotation for a question result
 * Returns empty annotation structure if not found
 */
export async function getAnnotation(questionResultId: string): Promise<AnnotationData> {
  // If there's no result ID yet, return empty annotations
  if (!questionResultId) {
    return {
      page: 1,
      lines: [],
      texts: [],
      stickyNotes: [],
    };
  }
  
  try {
    return await apiCall<AnnotationData>(
      `/question-results/${questionResultId}/annotation?ts=${Date.now()}`
    );
  } catch (error) {
    // If annotation doesn't exist, return empty structure
    console.log('Annotation not found, returning empty structure');
    return {
      page: 1,
      lines: [],
      texts: [],
      stickyNotes: [],
    };
  }
}

/**
 * Upload/save annotations for a question result
 */
export async function saveAnnotation(data: {
  assessment_id: string;
  question_id: string;
  student_id: string;
  mark: number;
  annotation: AnnotationData;
  annotation_only?: boolean;
}): Promise<void> {
  const blob = new Blob([JSON.stringify(data.annotation)], { type: 'application/json' });
  const formData = new FormData();
  
  formData.append('assessment_id', data.assessment_id);
  formData.append('question_id', data.question_id);
  formData.append('student_id', data.student_id);
  formData.append('mark', data.mark.toString());
  if (data.annotation_only) {
    formData.append('annotation_only', 'true');
  }
  formData.append('file', blob, 'annotations.json');

  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/question-results/upload-annotation`,
    {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to save annotation');
  }
}

/**
 * Update mark for a question result
 */
export async function updateMark(data: {
  assessment_id: string;
  question_id: string;
  student_id: string;
  mark: number;
}): Promise<void> {
  const formData = new FormData();
  formData.append('assessment_id', data.assessment_id);
  formData.append('question_id', data.question_id);
  formData.append('student_id', data.student_id);
  formData.append('mark', data.mark.toString());

  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/question-results/update-mark`,
    {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update mark');
  }
}

/**
 * Get all results for a student across all questions in an assessment
 */
export async function getStudentAllResults(
  studentId: string,
  assessmentId: string
): Promise<StudentAllResults> {
  return apiCall<StudentAllResults>(
    `/question-results/student/${studentId}/assessment/${assessmentId}/all-results`
  );
}

// ============================================================================
// Service Object Export
// ============================================================================

export const markingService = {
  getAnswerSheets,
  getAnswerSheetPdf,
  getQuestionResult,
  getAnnotation,
  saveAnnotation,
  updateMark,
  getStudentAllResults,
};
