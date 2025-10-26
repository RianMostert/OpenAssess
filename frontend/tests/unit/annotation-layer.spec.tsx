import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect } from 'vitest'

// Mock react-konva components to avoid canvas rendering in jsdom
vi.mock('react-konva', async () => {
  const React = (await vi.importActual('react')) as typeof import('react')
  // Render children so Lines/Text nodes appear in DOM and map Konva events to DOM events
  const Stage = React.forwardRef(({ children, onPointerDown, onMouseDown, ...rest }: any, ref: any) => {
    // provide a minimal getPointerPosition on the ref if requested by component
    React.useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') ref({ getPointerPosition: () => ({ x: 0, y: 0 }) })
        else ref.current = { getPointerPosition: () => ({ x: 0, y: 0 }) }
      }
    }, [ref])

    return (
      <div
        data-testid="stage"
        onMouseDown={(e) => {
          // call Konva-style onPointerDown if provided
          if (onPointerDown) onPointerDown({ evt: { clientX: e.clientX, clientY: e.clientY } })
          if (onMouseDown) onMouseDown(e)
        }}
      >
        {children}
      </div>
    )
  })

  const Layer = ({ children }: any) => <div data-testid="layer">{children}</div>
  const Line = (_props: any) => <div data-testid="line" />
  const Text = (props: any) => <div data-testid="text-node">{props.text}</div>

  return { Stage, Layer, Line, Text }
})

// Mock coordinate utils to return predictable pixel positions
vi.mock('@/lib/coordinateUtils', () => ({
  linePointsToPixels: (points: number[]) => points,
  positionToPixels: ({ x, y }: any) => ({ x: x * 1, y: y * 1 }),
  dimensionsToPixels: ({ width, height }: any) => ({ width: width || 0, height: height || 0 }),
  getScaledFontSize: (s: number) => s,
  getPageSizeFromComputedStyle: () => ({ width: 595, height: 842 }),
  positionToPercentage: (pos: any, pageSize: any) => ({ x: pos.x, y: pos.y }),
  linePointsToPercentage: (pts: any) => pts,
  dimensionsToPercentage: (dims: any) => dims,
}))

// Mock internal UI components used by AnnotationLayer
vi.mock('@dashboard/lecturer/course/components/StickyNote', () => ({
  default: (props: any) => <div data-testid="sticky-note">{props.content}</div>
}))

vi.mock('@dashboard/lecturer/course/components/TextNote', () => ({
  default: (props: any) => <div data-testid="text-note">{props.content}</div>
}))

import AnnotationLayer from '@dashboard/lecturer/course/components/AnnotationLayer'

describe('AnnotationLayer basic behaviour', () => {
  test('renders stage and layer and existing lines/texts/stickyNotes', () => {
    const annotations = {
      lines: [{ id: 'l1', tool: 'pencil', points: [10, 10, 20, 20], stroke: '#ff0000', strokeWidth: 2 }],
      texts: [{ id: 't1', tool: 'text-note', x: 10, y: 20, text: 'hello', fontSize: 12, fill: '#000' }],
      stickyNotes: [{ id: 's1', tool: 'sticky-note', x: 15, y: 25, text: 'note', fontSize: 12, fill: '#000' }],
    }

    const setAnnotations = vi.fn()

    render(
      <div id="page-1"><AnnotationLayer page={1} annotations={annotations as any} setAnnotations={setAnnotations} tool={null} containerRef={{ current: null }} rendered={true} /></div>
    )

    expect(screen.getByTestId('stage')).toBeTruthy()
    expect(screen.getAllByTestId('line').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('hello')).toBeTruthy()
    expect(screen.getByText('note')).toBeTruthy()
  })

  test('adds a text-note on pointer down when tool=text-note', () => {
    const annotations = { lines: [], texts: [], stickyNotes: [] }
    const setAnnotations = vi.fn()

    render(
      <div id="page-1"><AnnotationLayer page={1} annotations={annotations as any} setAnnotations={setAnnotations} tool={'text-note'} containerRef={{ current: null }} rendered={true} /></div>
    )

    const stage = screen.getByTestId('stage')
    // Simulate pointer down event with fake getPointerPosition via stageRef fallback
    fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 })

    // setAnnotations should have been called to add a new text element
    expect(setAnnotations).toHaveBeenCalled()
  })

  test('adds a sticky-note on pointer down when tool=sticky-note', () => {
    const annotations = { lines: [], texts: [], stickyNotes: [] }
    const setAnnotations = vi.fn()

    render(
      <div id="page-1"><AnnotationLayer page={1} annotations={annotations as any} setAnnotations={setAnnotations} tool={'sticky-note'} containerRef={{ current: null }} rendered={true} /></div>
    )

    const stage = screen.getByTestId('stage')
    fireEvent.mouseDown(stage, { clientX: 50, clientY: 50 })

    expect(setAnnotations).toHaveBeenCalled()
  })
})
