/**
 * Query Service
 * Handles all query-related API calls (mark queries and student queries)
 */

import { API_CONFIG, QueryStatus } from '@/lib/constants';
import type { QueryStatusValue } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface MarkQuery {
  id: number;
  student_id: number;
  question_result_id: number;
  query_text: string;
  response_text?: string;
  status_id: QueryStatusValue;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_surname?: string;
  question_number?: number;
}

export interface StudentQuery {
  id: number;
  student_id: number;
  assessment_id: number;
  query_text: string;
  response_text?: string;
  status_id: QueryStatusValue;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_surname?: string;
  assessment_name?: string;
}

export interface CreateMarkQueryData {
  question_result_id: number;
  query_text: string;
}

export interface CreateStudentQueryData {
  assessment_id: number;
  query_text: string;
}

export interface UpdateQueryData {
  query_text?: string;
  response_text?: string;
  status_id?: QueryStatusValue;
}

export interface QueryListParams {
  status_id?: QueryStatusValue;
  assessment_id?: number;
  student_id?: number;
  skip?: number;
  limit?: number;
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

/**
 * Build query string from params object
 */
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================================================
// Mark Query Service
// ============================================================================

export const markQueryService = {
  /**
   * Get all mark queries (with optional filters)
   */
  async getMarkQueries(params?: QueryListParams): Promise<MarkQuery[]> {
    const queryString = params ? buildQueryString(params) : '';
    return apiCall<MarkQuery[]>(`/mark-queries/${queryString}`);
  },

  /**
   * Get mark queries for a specific assessment
   */
  async getMarkQueriesByAssessment(
    courseId: number,
    assessmentId: number,
    params?: QueryListParams
  ): Promise<MarkQuery[]> {
    const queryString = params ? buildQueryString(params) : '';
    return apiCall<MarkQuery[]>(
      `/courses/${courseId}/assessments/${assessmentId}/mark-queries${queryString}`
    );
  },

  /**
   * Get a specific mark query by ID
   */
  async getMarkQuery(queryId: number): Promise<MarkQuery> {
    return apiCall<MarkQuery>(`/mark-queries/${queryId}`);
  },

  /**
   * Create a new mark query
   */
  async createMarkQuery(data: CreateMarkQueryData): Promise<MarkQuery> {
    return apiCall<MarkQuery>('/mark-queries/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a mark query
   */
  async updateMarkQuery(queryId: number, data: UpdateQueryData): Promise<MarkQuery> {
    return apiCall<MarkQuery>(`/mark-queries/${queryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a mark query
   */
  async deleteMarkQuery(queryId: number): Promise<void> {
    return apiCall<void>(`/mark-queries/${queryId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Approve a mark query
   */
  async approveMarkQuery(queryId: number, responseText?: string): Promise<MarkQuery> {
    return apiCall<MarkQuery>(`/mark-queries/${queryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status_id: QueryStatus.APPROVED,
        response_text: responseText,
      }),
    });
  },

  /**
   * Reject a mark query
   */
  async rejectMarkQuery(queryId: number, responseText?: string): Promise<MarkQuery> {
    return apiCall<MarkQuery>(`/mark-queries/${queryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status_id: QueryStatus.REJECTED,
        response_text: responseText,
      }),
    });
  },
};

// ============================================================================
// Student Query Service
// ============================================================================

export const studentQueryService = {
  /**
   * Get all student queries (with optional filters)
   */
  async getStudentQueries(params?: QueryListParams): Promise<StudentQuery[]> {
    const queryString = params ? buildQueryString(params) : '';
    return apiCall<StudentQuery[]>(`/student-queries/${queryString}`);
  },

  /**
   * Get student queries for a specific assessment
   */
  async getStudentQueriesByAssessment(
    courseId: number,
    assessmentId: number,
    params?: QueryListParams
  ): Promise<StudentQuery[]> {
    const queryString = params ? buildQueryString(params) : '';
    return apiCall<StudentQuery[]>(
      `/courses/${courseId}/assessments/${assessmentId}/student-queries${queryString}`
    );
  },

  /**
   * Get a specific student query by ID
   */
  async getStudentQuery(queryId: number): Promise<StudentQuery> {
    return apiCall<StudentQuery>(`/student-queries/${queryId}`);
  },

  /**
   * Create a new student query
   */
  async createStudentQuery(data: CreateStudentQueryData): Promise<StudentQuery> {
    return apiCall<StudentQuery>('/student-queries/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a student query
   */
  async updateStudentQuery(
    queryId: number,
    data: UpdateQueryData
  ): Promise<StudentQuery> {
    return apiCall<StudentQuery>(`/student-queries/${queryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a student query
   */
  async deleteStudentQuery(queryId: number): Promise<void> {
    return apiCall<void>(`/student-queries/${queryId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Respond to a student query
   */
  async respondToStudentQuery(queryId: number, responseText: string): Promise<StudentQuery> {
    return apiCall<StudentQuery>(`/student-queries/${queryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        response_text: responseText,
        status_id: QueryStatus.APPROVED, // Responding implies addressing the query
      }),
    });
  },
};
