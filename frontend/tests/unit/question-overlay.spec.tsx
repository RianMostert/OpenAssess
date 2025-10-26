import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect } from 'vitest'
import QuestionOverlay from '@dashboard/lecturer/course/grading/QuestionOverlay'

const baseQuestion = {
  id: 'q1',
  question_number: '1',
  page_number: 1,
  x: 10,
  y: 10,
  width: 20,
  height: 10,
  max_marks: 4,
  increment: 0.5,
  mark: 2,
  comment: 'Needs review',
}

describe('QuestionOverlay', () => {
  test('renders label, mark display, and comment indicator', () => {
    const onMarkChange = vi.fn()
    const onSelect = vi.fn()

    const { container } = render(
      <QuestionOverlay
        question={baseQuestion}
        onMarkChange={onMarkChange}
        onCommentChange={undefined}
        pageWidth={800}
        pageHeight={1000}
        isSelected={false}
        onSelect={onSelect}
      />
    )

    // heading label
    expect(screen.getByText(/q1/i)).toBeInTheDocument()

    // mark display shows current mark
    expect(screen.getByText(/2\/4/)).toBeInTheDocument()

    // comment indicator dot is present: check for an element with the purple background class
    const commentDot = container.querySelector('.bg-purple-500')
    expect(commentDot).toBeTruthy()
  })

  test('opens mark input when clicking mark display and submits via Enter', async () => {
    const onMarkChange = vi.fn()

    render(
      <QuestionOverlay
        question={baseQuestion}
        onMarkChange={onMarkChange}
        pageWidth={800}
        pageHeight={1000}
      />
    )

    // click the mark display (top-right control)
    const markDisplay = screen.getByText(/2\/4/)
    fireEvent.click(markDisplay)

    // input should appear
    const input = await screen.findByRole('spinbutton')
    expect(input).toBeInTheDocument()

    // change value and press Enter
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(onMarkChange).toHaveBeenCalledWith('q1', 3)
  })

  test('quick mark buttons call onMarkChange when selected', () => {
    const onMarkChange = vi.fn()

    render(
      <QuestionOverlay
        question={baseQuestion}
        onMarkChange={onMarkChange}
        pageWidth={800}
        pageHeight={1000}
        isSelected={true}
      />
    )

    // There should be quick mark buttons; click the first one
    const buttons = screen.getAllByRole('button')
    // find a button with numeric text
    const numericButton = buttons.find(b => /\d/.test(b.textContent || ''))
    expect(numericButton).toBeDefined()
    if (numericButton) {
      fireEvent.click(numericButton)
    }

    // onMarkChange should be called at least once
    expect(onMarkChange).toHaveBeenCalled()
  })
})
