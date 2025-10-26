import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import AuthPage from '@/app/auth/page'

describe('AuthPage component', () => {
  test('renders login heading and inputs', () => {
    render(<AuthPage />)

    // heading
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()

    // inputs
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  test('toggles to sign up mode', () => {
    render(<AuthPage />)

    const toggle = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(toggle)

    // after toggle, Sign Up heading should be present
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument()

    // additional fields should be visible in sign up mode
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument()
  })
})
