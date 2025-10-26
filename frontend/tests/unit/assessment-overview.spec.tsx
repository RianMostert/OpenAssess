import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import AssessmentOverview from '@dashboard/lecturer/course/overview/AssessmentOverview'

const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

// Mock QueryManagement component
vi.mock('@/app/dashboard/lecturer/course/components/QueryManagement', () => ({
  default: () => <div data-testid="query-management">Query Management</div>,
}))

describe('AssessmentOverview', () => {
  const mockCourse = {
    id: 'course-1',
    title: 'Computer Science 101',
    code: 'CS101',
  }

  const mockAssessment = {
    id: 'assessment-1',
    title: 'Midterm Exam',
    course_id: 'course-1',
    published: false,
  }

  const mockStats = {
    grading_completion: {
      total_submissions: 50,
      graded_submissions: 30,
      ungraded_submissions: 20,
      completion_percentage: 60,
    },
    grade_distribution: {
      average_score: 75.5,
      median_score: 78,
      highest_score: 95,
      lowest_score: 45,
      score_ranges: [],
    },
    question_performance: [
      {
        question_number: 1,
        question_title: 'Question 1',
        max_marks: 10,
        graded_count: 30,
        ungraded_count: 20,
        average_mark: 7.5,
        average_percentage: 75,
        highest_mark: 10,
        lowest_mark: 4,
      },
    ],
  }

  const mockSetActiveMode = vi.fn()
  const mockOnAssessmentUpdate = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.clearAllMocks()
    
    // Default: successful stats fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    })
  })

  test('renders assessment title and course', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    expect(screen.getByText('Midterm Exam')).toBeInTheDocument()
    expect(screen.getByText(/Computer Science 101/)).toBeInTheDocument()
  })

  test('shows loading state initially', () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    expect(screen.getByText('Loading assessment statistics...')).toBeInTheDocument()
  })

  test('displays grading progress after loading', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/30 of 50 graded/)).toBeInTheDocument()
    })

    expect(screen.getAllByText(/60%/)).toHaveLength(2) // Main card and table row
  })

  test('displays publication status', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Unpublished')).toBeInTheDocument()
    })

    expect(screen.getByText('Hidden from students')).toBeInTheDocument()
  })

  test('displays published status when assessment is published', async () => {
    const publishedAssessment = { ...mockAssessment, published: true }

    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={publishedAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    expect(screen.getByText('Visible to students')).toBeInTheDocument()
  })

  test('Grade button calls setActiveMode with grade', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/30 of 50 graded/)).toBeInTheDocument()
    })

    const gradeButton = screen.getByText('Grade')
    fireEvent.click(gradeButton)

    expect(mockSetActiveMode).toHaveBeenCalledWith('grade')
  })

  test('Map Questions button calls setActiveMode with map', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Map Questions')).toBeInTheDocument()
    })

    const mapButton = screen.getByText('Map Questions')
    fireEvent.click(mapButton)

    expect(mockSetActiveMode).toHaveBeenCalledWith('map')
  })

  test('displays question performance table', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument()
    })

    expect(screen.getByText('1 questions')).toBeInTheDocument()
  })

  test('shows message when no questions exist', async () => {
    const emptyStats = {
      ...mockStats,
      question_performance: [],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStats,
    })

    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No questions found for this assessment.')).toBeInTheDocument()
    })
  })

  test('renders QueryManagement component', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('query-management')).toBeInTheDocument()
    })
  })

  test('handles stats fetch failure gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to fetch' }),
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  test('displays total submissions count', async () => {
    render(
      <AssessmentOverview
        course={mockCourse as any}
        assessment={mockAssessment as any}
        setActiveMode={mockSetActiveMode}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    expect(screen.getByText('Answer sheets')).toBeInTheDocument()
  })
})
