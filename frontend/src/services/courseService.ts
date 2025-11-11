/**
 * Course Service
 * Handles all course-related API calls
 */

import { API_CONFIG } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface Course {
  id: string; // UUID
  title: string;
  code: string | null;
  teacher_id: string; // UUID
  created_at: string;
}

export interface CourseWithRole extends Course {
  role_id: number;
  role_name: string;
}

export interface Assessment {
  id: string; // UUID
  course_id: string; // UUID
  title: string;
  total_marks: number;
  question_count: number;
  created_at: string;
}

export interface AssessmentStats {
  total_students: number;
  students_with_marks: number;
  average_mark: number;
  median_mark: number;
  std_dev: number;
  highest_mark: number;
  lowest_mark: number;
}

export interface Question {
  id: string; // UUID
  assessment_id: string; // UUID
  question_number: number;
  max_marks: number;
  page_number: number;
}

export interface CourseUser {
  id: string; // UUID
  name: string;
  surname: string;
  email: string;
  student_number?: string;
  role_id: number;
  role_name: string;
}

export interface CreateCourseData {
  title: string;
  teacher_id: string;
  code?: string;
}

export interface UpdateCourseData {
  title?: string;
  teacher_id?: string;
  code?: string;
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
// Course Service
// ============================================================================

export const courseService = {
  /**
   * Get all courses for the authenticated user
   */
  async getCourses(): Promise<CourseWithRole[]> {
    return apiCall<CourseWithRole[]>('/courses/');
  },

  /**
   * Get a specific course by ID
   */
  async getCourse(courseId: string): Promise<Course> {
    return apiCall<Course>(`/courses/${courseId}`);
  },

  /**
   * Create a new course (admin/lecturer only)
   */
  async createCourse(data: CreateCourseData): Promise<Course> {
    return apiCall<Course>('/courses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing course
   */
  async updateCourse(courseId: string, data: UpdateCourseData): Promise<Course> {
    return apiCall<Course>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a course
   */
  async deleteCourse(courseId: string): Promise<void> {
    return apiCall<void>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all assessments for a course
   */
  async getAssessments(courseId: string): Promise<Assessment[]> {
    return apiCall<Assessment[]>(`/courses/${courseId}/assessments`);
  },

  /**
   * Get a specific assessment
   */
  async getAssessment(courseId: string, assessmentId: string): Promise<Assessment> {
    return apiCall<Assessment>(`/courses/${courseId}/assessments/${assessmentId}`);
  },

  /**
   * Get assessment statistics
   */
  async getAssessmentStats(
    courseId: string,
    assessmentId: string
  ): Promise<AssessmentStats> {
    return apiCall<AssessmentStats>(
      `/courses/${courseId}/assessments/${assessmentId}/stats`
    );
  },

  /**
   * Get questions for an assessment
   */
  async getQuestions(courseId: string, assessmentId: string): Promise<Question[]> {
    return apiCall<Question[]>(
      `/courses/${courseId}/assessments/${assessmentId}/questions`
    );
  },

  /**
   * Get all users enrolled in a course
   */
  async getCourseUsers(courseId: string): Promise<CourseUser[]> {
    return apiCall<CourseUser[]>(`/courses/${courseId}/users`);
  },

  /**
   * Add a user to a course
   */
  async addUserToCourse(
    courseId: string,
    userId: string,
    roleId: number
  ): Promise<void> {
    return apiCall<void>(`/courses/${courseId}/users`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    });
  },

  /**
   * Remove a user from a course
   */
  async removeUserFromCourse(courseId: string, userId: string): Promise<void> {
    return apiCall<void>(`/courses/${courseId}/users/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update a user's role in a course
   */
  async updateUserRole(
    courseId: string,
    userId: string,
    roleId: number
  ): Promise<void> {
    return apiCall<void>(`/courses/${courseId}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role_id: roleId }),
    });
  },

  /**
   * Get course statistics
   */
  async getCourseStats(courseId: string): Promise<any> {
    return apiCall<any>(`/courses/${courseId}/stats`);
  },

  /**
   * Get user's role in a course
   */
  async getMyCourseRole(courseId: string): Promise<any> {
    return apiCall<any>(`/courses/${courseId}/my-role`);
  },

  /**
   * Bulk upload students to course via CSV
   */
  async bulkUploadStudents(courseId: string, file: File, roleId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('role_id', roleId);

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_CONFIG.BASE_URL}/users/bulk-upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },

  /**
   * Bulk remove students from course via CSV
   */
  async bulkRemoveStudents(courseId: string, file: File, roleId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('role_id', roleId);

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_CONFIG.BASE_URL}/users/bulk-remove`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Remove operation failed');
    }

    return response.json();
  },

  /**
   * Bulk upload facilitators to course via CSV
   */
  async bulkUploadFacilitators(courseId: string, file: File, roleName: string = 'facilitator'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('role_name', roleName);

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_CONFIG.BASE_URL}/courses/${courseId}/facilitators/bulk-upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Facilitator upload failed');
    }

    return response.json();
  },

  /**
   * Bulk remove facilitators from course via CSV
   */
  async bulkRemoveFacilitators(courseId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_CONFIG.BASE_URL}/courses/${courseId}/facilitators/bulk-remove`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Facilitator removal failed');
    }

    return response.json();
  },
};
