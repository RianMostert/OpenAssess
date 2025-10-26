import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetch(...args),
}))

import EditAssessmentModal from '@dashboard/lecturer/course/components/EditAssessmentModel'

describe('EditAssessmentModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  test('selecting a file shows filename and submit triggers upload flow then update', async () => {
    // Mock upload then patch
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ file_path: '/files/new.pdf' }) }) // upload
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // patch

    const setOpen = vi.fn()
    const onAssessmentUpdated = vi.fn()

    render(
      <div>
        <EditAssessmentModal courseId={'course-1'} assessmentId={'ass-1'} initialTitle={'Old'} open={true} setOpen={setOpen} onAssessmentUpdated={onAssessmentUpdated} />
      </div>
    )

    const inputEl = document.querySelector('input[type="file"][accept=".pdf"]') as HTMLInputElement
    expect(inputEl).toBeTruthy()

    const file = new File(['new'], 'new-paper.pdf', { type: 'application/pdf' })
    fireEvent.change(inputEl, { target: { files: [file] } })

    expect(await screen.findByText(/Selected: new-paper.pdf/)).toBeTruthy()

    const submit = screen.getByRole('button', { name: /Update Assessment/i })
    fireEvent.click(submit)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      expect(setOpen).toHaveBeenCalledWith(false)
      expect(onAssessmentUpdated).toHaveBeenCalled()
    })
  })
})
