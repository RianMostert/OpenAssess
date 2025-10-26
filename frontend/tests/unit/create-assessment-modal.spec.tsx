import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

// Mock fetchWithAuth used by the component
const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

import CreateAssessmentModal from '@dashboard/lecturer/course/components/CreateAssessmentModel'

describe('CreateAssessmentModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  test('selecting a file shows filename and submit triggers upload flow', async () => {
    // Mock sequence: create assessment -> upload file -> patch assessment
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ass-1' }) }) // create
      .mockResolvedValueOnce({ ok: true, json: async () => ({ file_path: '/files/ass-1.pdf' }) }) // upload
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // patch

    const setOpen = vi.fn()
    const onAssessmentCreated = vi.fn()

    render(
      <div>
        <CreateAssessmentModal courseId={'course-1'} open={true} setOpen={setOpen} onAssessmentCreated={onAssessmentCreated} />
      </div>
    )

  // Fill the required title input so validation allows submit
  const titleInput = screen.getByPlaceholderText('Assessment Title') as HTMLInputElement
  fireEvent.change(titleInput, { target: { value: 'Midterm 1' } })

  // File input
  const fileInput = screen.getByRole('textbox', { hidden: true }) || screen.getByLabelText?.('')
  // Fallback - query the input element directly
  const inputEl = document.querySelector('input[type="file"][accept=".pdf"]') as HTMLInputElement
    expect(inputEl).toBeTruthy()

    const file = new File(['dummy content'], 'paper.pdf', { type: 'application/pdf' })
    // Simulate selecting a file
    fireEvent.change(inputEl, { target: { files: [file] } })

    // Filename should be displayed
    expect(await screen.findByText(/Selected: paper.pdf/)).toBeTruthy()

    // Submit the form
    const submit = screen.getByRole('button', { name: /Create Assessment/i })
    fireEvent.click(submit)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      expect(setOpen).toHaveBeenCalledWith(false)
      expect(onAssessmentCreated).toHaveBeenCalled()
    })
  })
})
