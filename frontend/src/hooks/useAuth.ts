import { useState, useEffect } from 'react';
import { STORAGE_KEYS, PrimaryRole, ROUTES } from '@/lib/constants';
import type { PrimaryRoleValue } from '@/lib/constants';

export interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  student_number?: string;
  primary_role_id: PrimaryRoleValue;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Custom hook for managing authentication state
 * Centralizes all auth-related logic and localStorage operations
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        if (token && userDataStr) {
          const user = JSON.parse(userDataStr) as User;
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Log in a user
   */
  const login = (user: User, token: string) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  /**
   * Log out the current user
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // Redirect to login
    window.location.href = ROUTES.LOGIN;
  };

  /**
   * Update user data
   */
  const updateUser = (userData: Partial<User>) => {
    if (!authState.user) return;
    
    const updatedUser = { ...authState.user, ...userData };
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    
    setAuthState(prev => ({
      ...prev,
      user: updatedUser,
    }));
  };

  /**
   * Check if user has a specific primary role
   */
  const hasRole = (roleId: PrimaryRoleValue): boolean => {
    return authState.user?.primary_role_id === roleId;
  };

  /**
   * Check if user is an administrator
   */
  const isAdmin = (): boolean => {
    return hasRole(PrimaryRole.ADMINISTRATOR);
  };

  /**
   * Check if user is a lecturer
   */
  const isLecturer = (): boolean => {
    return hasRole(PrimaryRole.LECTURER);
  };

  /**
   * Check if user is a student
   */
  const isStudent = (): boolean => {
    return hasRole(PrimaryRole.STUDENT);
  };

  /**
   * Get the appropriate dashboard route for the user
   */
  const getDashboardRoute = (): string => {
    if (!authState.user) return ROUTES.LOGIN;
    
    switch (authState.user.primary_role_id) {
      case PrimaryRole.ADMINISTRATOR:
      case PrimaryRole.LECTURER:
        return ROUTES.DASHBOARD.LECTURER;
      case PrimaryRole.STUDENT:
        return ROUTES.DASHBOARD.STUDENT;
      default:
        return ROUTES.HOME;
    }
  };

  return {
    // State
    ...authState,
    
    // Actions
    login,
    logout,
    updateUser,
    
    // Helpers
    hasRole,
    isAdmin,
    isLecturer,
    isStudent,
    getDashboardRoute,
  };
}
