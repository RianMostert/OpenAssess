import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

import QueryModal from '@dashboard/lecturer/course/components/QueryModal'

describe('QueryModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.restoreAllMocks()
  })

  test('loads questions, allows selecting and submitting a query batch', async () => {
    // Mock loadQuestions response
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ questions: [
      { question_id: 'q1', question_number: '1', max_marks: 10, mark: 7 }
    ] }) })

    // Mock batch submit response
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ created_count: 1 }) })

    const onClose = vi.fn()
    const onQuerySubmitted = vi.fn()

    const { container } = render(
      <QueryModal isOpen={true} onClose={onClose} assessmentId={'ass-1'} assessmentTitle={'Midterm'} onQuerySubmitted={onQuerySubmitted} />
    )

    // Wait for question to appear
    expect(await screen.findByText(/Question 1/)).toBeTruthy()

    // Select the checkbox for question 1
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox).toBeTruthy()
    fireEvent.click(checkbox)

    // Fill the explanation textarea with >= 10 chars
    const textarea = await screen.findByPlaceholderText(/Explain your query for this specific question.../)
    fireEvent.change(textarea, { target: { value: 'Please re-evaluate because answer key seems inconsistent' } })

    // Spy on alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Submit/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // Two calls: one for loading questions, one for submit
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Query batch submitted successfully'))
      expect(onQuerySubmitted).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
