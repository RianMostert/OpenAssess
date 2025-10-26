import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import CourseView from '@dashboard/lecturer/course/CourseView'

// Mock child components to avoid complex dependencies
vi.mock('@dashboard/lecturer/course/CourseLeftPanel', () => ({
  default: ({ selectedCourse, selectedAssessment }: any) => (
    <div data-testid="course-left-panel">
      {selectedCourse && <div>Course: {selectedCourse.title}</div>}
      {selectedAssessment && <div>Assessment: {selectedAssessment.title}</div>}
    </div>
  ),
}))

vi.mock('@dashboard/lecturer/course/overview/CourseOverview', () => ({
  default: ({ course }: any) => (
    <div data-testid="course-overview">Course Overview: {course.title}</div>
  ),
}))

vi.mock('@dashboard/lecturer/course/overview/AssessmentOverview', () => ({
  default: ({ assessment }: any) => (
    <div data-testid="assessment-overview">Assessment Overview: {assessment.title}</div>
  ),
}))

vi.mock('@dashboard/lecturer/course/mapping/MappingView', () => ({
  default: () => <div data-testid="mapping-view">Mapping View</div>,
}))

vi.mock('@dashboard/lecturer/course/grading/GradingView', () => ({
  default: () => <div data-testid="grading-view">Grading View</div>,
}))

describe('CourseView', () => {
  const mockOnToggleCollapse = vi.fn()

  test('renders select course message when no course selected', () => {
    render(<CourseView isCollapsed={false} onToggleCollapse={mockOnToggleCollapse} />)

    expect(screen.getByText('Select a course to get started')).toBeInTheDocument()
  })

  test('renders CourseLeftPanel', () => {
    render(<CourseView isCollapsed={false} onToggleCollapse={mockOnToggleCollapse} />)

    expect(screen.getByTestId('course-left-panel')).toBeInTheDocument()
  })

  test('applies mobile layout when isMobile is true', () => {
    const { container } = render(
      <CourseView isCollapsed={false} onToggleCollapse={mockOnToggleCollapse} isMobile={true} />
    )

    // Mobile layout should use flex-col
    const mainDiv = container.querySelector('.flex-col')
    expect(mainDiv).toBeInTheDocument()
  })

  test('applies desktop layout by default', () => {
    const { container } = render(
      <CourseView isCollapsed={false} onToggleCollapse={mockOnToggleCollapse} isMobile={false} />
    )

    // Desktop layout should use flex-row
    const mainDiv = container.querySelector('.flex-row')
    expect(mainDiv).toBeInTheDocument()
  })
})
