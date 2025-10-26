import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import NavBar from '@dashboard/lecturer/NavBar'

describe('NavBar', () => {
  const mockItemSelected = vi.fn()

  test('renders desktop navbar with all nav items', () => {
    render(<NavBar activeNavItem="courses" itemSelected={mockItemSelected} />)

    // All nav items should be present
    expect(screen.getByTitle('Courses')).toBeInTheDocument()
    expect(screen.getByTitle('Profile')).toBeInTheDocument()
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  test('highlights active nav item on desktop', () => {
    render(<NavBar activeNavItem="profile" itemSelected={mockItemSelected} />)

    const profileButton = screen.getByTitle('Profile')
    expect(profileButton).toHaveClass('bg-accent')
  })

  test('calls itemSelected when nav item is clicked', () => {
    render(<NavBar activeNavItem="courses" itemSelected={mockItemSelected} />)

    const settingsButton = screen.getByTitle('Settings')
    fireEvent.click(settingsButton)

    expect(mockItemSelected).toHaveBeenCalledWith('settings')
  })

  test('renders mobile navbar horizontally', () => {
    render(<NavBar activeNavItem="courses" itemSelected={mockItemSelected} isMobile={true} />)

    // Mobile should show text labels
    expect(screen.getByText('Courses')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('highlights active item in mobile view', () => {
    render(<NavBar activeNavItem="settings" itemSelected={mockItemSelected} isMobile={true} />)

    const settingsButton = screen.getByTitle('Settings')
    expect(settingsButton).toHaveClass('bg-accent')
  })
})
