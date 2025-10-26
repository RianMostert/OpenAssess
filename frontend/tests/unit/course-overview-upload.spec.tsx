import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

import CourseOverview from '@dashboard/lecturer/course/overview/CourseOverview'

const sampleCourse = { id: 'course-1', title: 'Intro', code: 'C100', teacher_id: 'teacher-1' }

describe('CourseOverview file uploads', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.restoreAllMocks()
  })

  test('student CSV upload success calls fetch and alerts', async () => {
    // Sequence: fetchCourseStats, fetchUserRole, upload, fetchCourseStats
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ totalStudents: 0, averagePerformance: 0, assessments: [] }) }) // stats
      .mockResolvedValueOnce({ ok: true, json: async () => ({ role: 'convener' }) }) // role
      .mockResolvedValueOnce({ ok: true, json: async () => (Array.from({ length: 5 })) }) // upload returns array of created users
      .mockResolvedValueOnce({ ok: true, json: async () => ({ totalStudents: 5, averagePerformance: 0, assessments: [] }) }) // refresh stats

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { container } = render(<CourseOverview course={sampleCourse} userRole={'convener'} />)

    // Wait for loading to finish and inputs to render
    await waitFor(() => {
      const fileInputs = container.querySelectorAll('input[type="file"][accept=".csv"]')
      expect(fileInputs.length).toBeGreaterThan(0)
    })
    const fileInputs = container.querySelectorAll('input[type="file"][accept=".csv"]')
    const studentInput = fileInputs[0] as HTMLInputElement

    const file = new File(['csvcontent'], 'students.csv', { type: 'text/csv' })
    fireEvent.change(studentInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      expect(alertSpy).toHaveBeenCalled()
      // alert message contains the number of created users
      expect(alertSpy.mock.calls[0][0]).toContain('Successfully created')
    })
  })

  test('student CSV remove cancels when user declines confirm', async () => {
    // Stats and role initial calls
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ totalStudents: 10, averagePerformance: 0, assessments: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ role: 'convener' }) })

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { container } = render(<CourseOverview course={sampleCourse} userRole={'convener'} />)

    await waitFor(() => {
      const fileInputs = container.querySelectorAll('input[type="file"][accept=".csv"]')
      expect(fileInputs.length).toBeGreaterThan(0)
    })
    const fileInputs = container.querySelectorAll('input[type="file"][accept=".csv"]')
    // The second input corresponds to the "- Remove" button based on markup order
    const removeInput = fileInputs[1] as HTMLInputElement

    const file = new File(['csvcontent'], 'toRemove.csv', { type: 'text/csv' })
    fireEvent.change(removeInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      // Since user declined, no fetch should be called for removal
      expect(mockFetch).toHaveBeenCalledTimes(2) // only the initial stats and role calls
    })
  })
})
