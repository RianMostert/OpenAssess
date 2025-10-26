// Mock for react-konva to avoid canvas.node dependency in tests
import { vi } from 'vitest'

export const Stage = vi.fn(({ children, ...props }: any) => children)
export const Layer = vi.fn(({ children, ...props }: any) => children)
export const Line = vi.fn(() => null)
export const Circle = vi.fn(() => null)
export const Rect = vi.fn(() => null)
export const Text = vi.fn(() => null)
export const Image = vi.fn(() => null)
