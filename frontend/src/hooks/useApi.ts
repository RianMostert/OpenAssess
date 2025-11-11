import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialLoading?: boolean;
}

export interface UseApiState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export interface UseApiReturn<T, TParams extends any[]> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  execute: (...params: TParams) => Promise<T | null>;
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook for making API calls with loading and error states
 * 
 * @example
 * ```tsx
 * const { data, error, isLoading, execute } = useApi(
 *   courseService.getCourses,
 *   {
 *     onSuccess: (courses) => console.log('Loaded courses:', courses),
 *     onError: (error) => console.error('Failed to load courses:', error),
 *   }
 * );
 * 
 * // Execute the API call
 * useEffect(() => {
 *   execute();
 * }, []);
 * ```
 */
export function useApi<T, TParams extends any[] = []>(
  apiFunction: (...params: TParams) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T, TParams> {
  const { onSuccess, onError, initialLoading = false } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: initialLoading,
  });

  const execute = useCallback(
    async (...params: TParams): Promise<T | null> => {
      setState({ data: null, error: null, isLoading: true });

      try {
        const result = await apiFunction(...params);
        setState({ data: result, error: null, isLoading: false });
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error('An unknown error occurred');
        setState({ data: null, error: apiError, isLoading: false });
        
        if (onError) {
          onError(apiError);
        }
        
        return null;
      }
    },
    [apiFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// ============================================================================
// Variation: useApiLazy (doesn't execute immediately)
// ============================================================================

/**
 * Lazy version of useApi that doesn't execute on mount
 * Useful for mutations or manual triggers
 * 
 * @example
 * ```tsx
 * const { isLoading, execute } = useApiLazy(courseService.createCourse);
 * 
 * const handleSubmit = async () => {
 *   const course = await execute({ code: 'CS101', name: 'Intro', year: 2024 });
 *   if (course) {
 *     router.push(`/courses/${course.id}`);
 *   }
 * };
 * ```
 */
export function useApiLazy<T, TParams extends any[] = []>(
  apiFunction: (...params: TParams) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T, TParams> {
  return useApi(apiFunction, { ...options, initialLoading: false });
}
