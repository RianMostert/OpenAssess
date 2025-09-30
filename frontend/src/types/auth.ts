export interface UserInfo {
  sub: string;
  exp: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  primary_role_id: number;
}

// Role ID constants matching backend
export const PRIMARY_ROLE_ADMINISTRATOR = 1;
export const PRIMARY_ROLE_STAFF = 2;
export const PRIMARY_ROLE_STUDENT = 3;

export const COURSE_ROLE_CONVENER = 1;
export const COURSE_ROLE_FACILITATOR = 2;
export const COURSE_ROLE_STUDENT = 3;

export type PrimaryRole = 'administrator' | 'staff' | 'student';
export type CourseRole = 'convener' | 'facilitator' | 'student';

export const getRoleDisplayName = (roleId: number | null | undefined): string => {
  if (!roleId) return 'Unknown';
  
  switch (roleId) {
    case PRIMARY_ROLE_ADMINISTRATOR:
      return 'Administrator';
    case PRIMARY_ROLE_STAFF:
      return 'Staff';
    case PRIMARY_ROLE_STUDENT:
      return 'Student';
    default:
      return 'Unknown';
  }
};

export const isStudent = (roleId: number | null | undefined): boolean => {
  return roleId === PRIMARY_ROLE_STUDENT;
};

export const isStaff = (roleId: number | null | undefined): boolean => {
  return roleId === PRIMARY_ROLE_STAFF;
};

export const isAdministrator = (roleId: number | null | undefined): boolean => {
  return roleId === PRIMARY_ROLE_ADMINISTRATOR;
};

export const canAccessLecturerDashboard = (roleId: number | null | undefined): boolean => {
  return isStaff(roleId) || isAdministrator(roleId);
};