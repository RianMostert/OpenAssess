import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

// Mock the PDF viewer which may import konva/canvas; provide a simple stub
vi.mock('@dashboard/lecturer/course/components/QueryReviewPdfViewer', () => ({
  default: (props: any) => {
    return React.createElement('div', { 'data-testid': 'pdf-viewer' }, 'PDF')
  }
}))

import QueryReviewModal from '@dashboard/lecturer/course/components/QueryReviewModal'

describe('QueryReviewModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.restoreAllMocks()
  })

  test('loads batch, displays query and submits responses calling onRefresh and onClose', async () => {
    // Sequence: assessment, queries, questions, then PUT response for submit
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ass-1', title: 'Midterm', course_id: 'c1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ([{
        id: 'q1', student_id: 's1', assessment_id: 'ass-1', requested_change: 'Please check marking for part (b)', query_type: 'mark', status: 'pending', created_at: '2025-10-01T12:00:00Z', question_number: '2', current_mark: 5, question_id: 'qq1'
      }]) })
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) })
      // PUT response for submit - needs both ok and json
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const onClose = vi.fn()
    const onRefresh = vi.fn()

    const batch = {
      batch_id: 'b1',
      student_id: 's1',
      student_name: 'Alice',
      assessment_id: 'ass-1',
      assessment_title: 'Midterm',
      question_count: 1,
      query_types: ['mark'],
      created_at: '2025-10-01T12:00:00Z',
      status: 'pending'
    }

    render(<QueryReviewModal batch={batch as any} isOpen={true} onClose={onClose} onRefresh={onRefresh} />)

    // Wait for the requested_change text to appear
    expect(await screen.findByText(/Please check marking for part/)).toBeTruthy()

    // Ensure student name shown in header
    expect(screen.getByText(/Alice/)).toBeTruthy()

    // Spy on alert so it doesn't actually pop up
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Submit All/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      expect(alertSpy).toHaveBeenCalledWith('All responses submitted successfully')
      expect(onRefresh).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
