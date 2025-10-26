import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

// Mock QueryReviewModal, export a simple component that shows when open
vi.mock('@dashboard/lecturer/course/components/QueryReviewModal', () => ({
  default: ({ batch, isOpen, onClose, onRefresh }: any) => {
    if (!isOpen) return null
    return React.createElement('div', { 'data-testid': 'mock-review-modal' }, [
      React.createElement('div', { key: 'title' }, `Reviewing: ${batch?.student_name || 'unknown'}`),
      React.createElement('button', { key: 'close', onClick: onClose }, 'Close'),
      React.createElement('button', { key: 'refresh', onClick: onRefresh }, 'Refresh')
    ])
  }
}))

import QueryManagement from '@dashboard/lecturer/course/components/QueryManagement'

describe('QueryManagement', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.restoreAllMocks()
  })

  test('fetches batches and opens review modal when Review clicked', async () => {
    const sampleBatches = [{
      batch_id: 'b1', student_id: 's1', student_name: 'Alice', assessment_id: 'ass-1', assessment_title: 'Midterm', question_count: 1, query_types: ['mark'], preview_text: 'please check', created_at: '2025-10-01T12:00:00Z', status: 'pending'
    }]

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleBatches })

    render(<QueryManagement courseId={'c1'} assessmentId={'ass-1'} />)

    // Wait for table row to appear
    expect(await screen.findByText(/Alice/)).toBeTruthy()

    // Click Review button
    const reviewBtn = screen.getByText('Review')
    fireEvent.click(reviewBtn)

    // Modal should appear
    expect(await screen.findByTestId('mock-review-modal')).toBeTruthy()

    // Click Refresh inside mock modal should trigger a re-fetch (another fetch call)
    const refreshBtn = screen.getByText('Refresh')
    fireEvent.click(refreshBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2) // initial fetch + refresh
    })
  })
})
