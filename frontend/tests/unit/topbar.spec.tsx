import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import TopBar from '@dashboard/lecturer/TopBar'

describe('TopBar', () => {
  const mockToggleLeftSidebar = vi.fn()

  test('renders application title', () => {
    render(
      <TopBar
        toggleLeftSidebar={mockToggleLeftSidebar}
        leftSidebarCollapsed={false}
        rightSidebarCollapsed={false}
      />
    )

    expect(screen.getByText('Assessment Manager')).toBeInTheDocument()
  })

  test('shows toggle button on desktop', () => {
    render(
      <TopBar
        toggleLeftSidebar={mockToggleLeftSidebar}
        leftSidebarCollapsed={false}
        rightSidebarCollapsed={false}
        isMobile={false}
      />
    )

    const toggleButton = screen.getByTitle('Hide Left Sidebar')
    expect(toggleButton).toBeInTheDocument()
  })

  test('hides toggle button on mobile', () => {
    render(
      <TopBar
        toggleLeftSidebar={mockToggleLeftSidebar}
        leftSidebarCollapsed={false}
        rightSidebarCollapsed={false}
        isMobile={true}
      />
    )

    expect(screen.queryByTitle('Hide Left Sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Show Left Sidebar')).not.toBeInTheDocument()
  })

  test('calls toggleLeftSidebar when button is clicked', () => {
    render(
      <TopBar
        toggleLeftSidebar={mockToggleLeftSidebar}
        leftSidebarCollapsed={false}
        rightSidebarCollapsed={false}
      />
    )

    const toggleButton = screen.getByTitle('Hide Left Sidebar')
    fireEvent.click(toggleButton)

    expect(mockToggleLeftSidebar).toHaveBeenCalled()
  })

  test('shows correct title when sidebar is collapsed', () => {
    render(
      <TopBar
        toggleLeftSidebar={mockToggleLeftSidebar}
        leftSidebarCollapsed={true}
        rightSidebarCollapsed={false}
      />
    )

    expect(screen.getByTitle('Show Left Sidebar')).toBeInTheDocument()
  })

  test('shows correct title when sidebar is expanded', () => {
    render(
      <TopBar
        toggleLeftSidebar={mockToggleLeftSidebar}
        leftSidebarCollapsed={false}
        rightSidebarCollapsed={false}
      />
    )

    expect(screen.getByTitle('Hide Left Sidebar')).toBeInTheDocument()
  })
})
