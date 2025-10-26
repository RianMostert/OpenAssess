import '@testing-library/jest-dom'

// minimal fetch polyfill for components that call fetch during tests
import 'whatwg-fetch'

// mock next/navigation's useRouter for client components
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as React from 'react'

// Use a static mock module for next/navigation to avoid SSR transform issues

// Use the global test lifecycle hook exposed by vitest
(globalThis as any).afterEach(() => {
  cleanup()
})

// jsdom doesn't provide ResizeObserver; some components use it (PDF pages, canvas wrappers).
// Provide a minimal mock so components that set up ResizeObserver in useEffect won't throw.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Some modules / JSX transforms expect `React` to be in scope — ensure it's available globally in the test environment.
globalThis.React = React
