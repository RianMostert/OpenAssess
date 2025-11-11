/**
 * File Service
 * Handles all file upload and download operations
 */

import { API_CONFIG, FileType, ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/constants';
import type { FileTypeValue } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface UploadedFile {
  id: number;
  assessment_id: number;
  file_type_id: FileTypeValue;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

export interface UploadFileParams {
  assessmentId: number;
  fileTypeId: FileTypeValue;
  file: File;
}

// ============================================================================
// Validation
// ============================================================================

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validate file before upload
 */
function validateFile(file: File): void {
  // Check file extension
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension as any)) {
    throw new FileValidationError(
      `Invalid file type. Only ${ALLOWED_FILE_EXTENSIONS.join(', ')} files are allowed.`
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    throw new FileValidationError(
      `File size exceeds the maximum allowed size of ${maxSizeMB}MB.`
    );
  }
}

// ============================================================================
// API Helper
// ============================================================================

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('authToken');
  
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// File Service
// ============================================================================

export const fileService = {
  /**
   * Upload a file for an assessment
   */
  async uploadFile(params: UploadFileParams): Promise<UploadedFile> {
    const { assessmentId, fileTypeId, file } = params;

    // Validate file before upload
    validateFile(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type_id', String(fileTypeId));

    return apiCall<UploadedFile>(`/assessments/${assessmentId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Get all files for an assessment
   */
  async getAssessmentFiles(assessmentId: number): Promise<UploadedFile[]> {
    return apiCall<UploadedFile[]>(`/assessments/${assessmentId}/files`);
  },

  /**
   * Get files by type for an assessment
   */
  async getAssessmentFilesByType(
    assessmentId: number,
    fileTypeId: FileTypeValue
  ): Promise<UploadedFile[]> {
    return apiCall<UploadedFile[]>(
      `/assessments/${assessmentId}/files?file_type_id=${fileTypeId}`
    );
  },

  /**
   * Get a specific file
   */
  async getFile(fileId: number): Promise<UploadedFile> {
    return apiCall<UploadedFile>(`/files/${fileId}`);
  },

  /**
   * Delete a file
   */
  async deleteFile(fileId: number): Promise<void> {
    return apiCall<void>(`/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Download a file
   * Returns the blob URL for the file
   */
  async downloadFile(fileId: number): Promise<string> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/files/${fileId}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Get file URL for viewing/embedding
   */
  getFileUrl(fileId: number): string {
    const token = localStorage.getItem('authToken');
    return `${API_CONFIG.BASE_URL}/files/${fileId}/download${token ? `?token=${token}` : ''}`;
  },

  /**
   * Upload memo file
   */
  async uploadMemo(assessmentId: number, file: File): Promise<UploadedFile> {
    return this.uploadFile({
      assessmentId,
      fileTypeId: FileType.MEMO,
      file,
    });
  },

  /**
   * Upload solution file
   */
  async uploadSolution(assessmentId: number, file: File): Promise<UploadedFile> {
    return this.uploadFile({
      assessmentId,
      fileTypeId: FileType.SOLUTION,
      file,
    });
  },

  /**
   * Upload question paper file
   */
  async uploadQuestionPaper(assessmentId: number, file: File): Promise<UploadedFile> {
    return this.uploadFile({
      assessmentId,
      fileTypeId: FileType.QUESTION_PAPER,
      file,
    });
  },

  /**
   * Bulk upload answer sheets (PDFs)
   */
  async bulkUploadAnswerSheets(assessmentId: string, files: File[]): Promise<any> {
    const formData = new FormData();
    formData.append('assessment_id', assessmentId);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    return apiCall<any>('/uploaded-files/bulk-upload', {
      method: 'POST',
      body: formData,
    });
  },
};
