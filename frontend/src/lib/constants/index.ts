/**
 * Application-wide constants
 * Centralized location for all magic strings and numbers
 */

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// ============================================================================
// User Roles
// ============================================================================

export const PrimaryRole = {
  ADMINISTRATOR: 1,
  LECTURER: 2,
  STUDENT: 3,
} as const;

export const CourseRole = {
  CONVENER: 1,
  FACILITATOR: 2,
  MARKER: 3,
} as const;

export type PrimaryRoleValue = typeof PrimaryRole[keyof typeof PrimaryRole];
export type CourseRoleValue = typeof CourseRole[keyof typeof CourseRole];

// Role display names
export const PRIMARY_ROLE_NAMES: Record<PrimaryRoleValue, string> = {
  [PrimaryRole.ADMINISTRATOR]: 'Administrator',
  [PrimaryRole.LECTURER]: 'Lecturer',
  [PrimaryRole.STUDENT]: 'Student',
};

export const COURSE_ROLE_NAMES: Record<CourseRoleValue, string> = {
  [CourseRole.CONVENER]: 'Convener',
  [CourseRole.FACILITATOR]: 'Facilitator',
  [CourseRole.MARKER]: 'Marker',
};

// ============================================================================
// Query Status
// ============================================================================

export const QueryStatus = {
  PENDING: 1,
  REJECTED: 2,
  APPROVED: 3,
} as const;

export type QueryStatusValue = typeof QueryStatus[keyof typeof QueryStatus];

export const QUERY_STATUS_NAMES: Record<QueryStatusValue, string> = {
  [QueryStatus.PENDING]: 'Pending',
  [QueryStatus.REJECTED]: 'Rejected',
  [QueryStatus.APPROVED]: 'Approved',
};

export const QUERY_STATUS_COLORS: Record<QueryStatusValue, string> = {
  [QueryStatus.PENDING]: 'text-yellow-600 bg-yellow-50',
  [QueryStatus.REJECTED]: 'text-red-600 bg-red-50',
  [QueryStatus.APPROVED]: 'text-green-600 bg-green-50',
};

// ============================================================================
// File Types
// ============================================================================

export const FileType = {
  MEMO: 1,
  SOLUTION: 2,
  QUESTION_PAPER: 3,
} as const;

export type FileTypeValue = typeof FileType[keyof typeof FileType];

export const FILE_TYPE_NAMES: Record<FileTypeValue, string> = {
  [FileType.MEMO]: 'Memo',
  [FileType.SOLUTION]: 'Solution',
  [FileType.QUESTION_PAPER]: 'Question Paper',
};

// Allowed file extensions
export const ALLOWED_FILE_EXTENSIONS = ['.pdf'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// ============================================================================
// Pagination & Limits
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// UI Messages
// ============================================================================

export const UI_MESSAGES = {
  // Success messages
  SUCCESS: {
    QUERY_SUBMITTED: 'Query submitted successfully',
    QUERY_UPDATED: 'Query updated successfully',
    FILE_UPLOADED: 'File uploaded successfully',
    CHANGES_SAVED: 'Changes saved successfully',
    MARK_SUBMITTED: 'Mark submitted successfully',
  },
  
  // Error messages
  ERROR: {
    GENERIC: 'An error occurred. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    FILE_TOO_LARGE: 'File size exceeds the maximum allowed size.',
    INVALID_FILE_TYPE: 'Invalid file type. Only PDF files are allowed.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  },
  
  // Loading messages
  LOADING: {
    DEFAULT: 'Loading...',
    FETCHING_DATA: 'Fetching data...',
    UPLOADING: 'Uploading file...',
    SAVING: 'Saving changes...',
    PROCESSING: 'Processing...',
  },
  
  // Confirmation messages
  CONFIRM: {
    DELETE: 'Are you sure you want to delete this item?',
    SUBMIT: 'Are you sure you want to submit?',
    DISCARD_CHANGES: 'Are you sure you want to discard your changes?',
  },
} as const;

// ============================================================================
// Routes
// ============================================================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: {
    LECTURER: '/dashboard/lecturer',
    STUDENT: '/dashboard/student',
  },
  COURSE: (courseId: number) => `/courses/${courseId}`,
  ASSESSMENT: (courseId: number, assessmentId: number) => 
    `/courses/${courseId}/assessments/${assessmentId}`,
  MARKING: (courseId: number, assessmentId: number) =>
    `/courses/${courseId}/assessments/${assessmentId}/marking`,
} as const;

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_QUERY_LENGTH: 10,
  MAX_QUERY_LENGTH: 1000,
  MIN_MARKS: 0,
  MAX_MARKS: 100,
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  THEME: 'theme',
} as const;

// ============================================================================
// Date/Time Formats
// ============================================================================

export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;
