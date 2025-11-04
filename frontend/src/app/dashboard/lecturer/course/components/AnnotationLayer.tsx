import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import Konva from 'konva';
import StickyNote from '@dashboard/lecturer/course/components/StickyNote';
import TextNote from '@dashboard/lecturer/course/components/TextNote';
import { 
    linePointsToPercentage, 
    linePointsToPixels, 
    positionToPercentage, 
    positionToPixels,
    dimensionsToPixels,
    dimensionsToPercentage,
    getScaledFontSize,
    getPageSizeFromComputedStyle 
} from '@/lib/coordinateUtils';

export interface LineElement {
    id: string;
    tool: 'pencil' | 'eraser';
    points: number[]; // Now stored as percentage coordinates
    stroke: string;
    strokeWidth: number;
    compositeOperation?: string;
}

export interface TextElement {
    id: string;
    tool: 'text-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    width?: number;
    height?: number;
}

export interface StickyNoteElement {
    id: string;
    tool: 'sticky-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    width?: number;
    height?: number; 
}

type Tool = 'pencil' | 'eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

export interface AnnotationLayerProps {
    page: number;
    annotations: {
        page?: number; // Optional page number for compatibility
        lines: LineElement[];
        texts: TextElement[];
        stickyNotes: StickyNoteElement[];
    };
    setAnnotations: (annotations: AnnotationLayerProps['annotations']) => void;
    tool: Tool | null;
    containerRef: React.RefObject<HTMLDivElement | null>;
    rendered: boolean;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    page,
    annotations,
    setAnnotations,
    tool,
    containerRef,
    rendered,
}) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<number[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const stageRef = useRef<any>(null);

    // Get current page size for coordinate conversion
    const getPageSize = () => {
        return getPageSizeFromComputedStyle(page) || dimensions;
    };

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            const pageCanvas = document.querySelector(`#page-${page} canvas`);
            if (pageCanvas) {
                const { width, height } = pageCanvas.getBoundingClientRect();
                setDimensions({ width, height });
            }
        });

        const pageCanvas = document.querySelector(`#page-${page} canvas`);
        if (pageCanvas) {
            observer.observe(pageCanvas);
            // Set initial dimensions
            const { width, height } = pageCanvas.getBoundingClientRect();
            setDimensions({ width, height });
        }

        return () => {
            if (pageCanvas) {
                observer.unobserve(pageCanvas);
            }
        };
    }, [page]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isWindowsDelete = e.key === 'Delete';
            const isMacDelete = e.metaKey && e.key === 'Backspace';
            if ((isWindowsDelete || isMacDelete) && selectedId) {
                setAnnotations({
                    ...annotations,
                    stickyNotes: annotations.stickyNotes.filter(note => note.id !== selectedId),
                    texts: annotations.texts.filter(text => text.id !== selectedId),
                    lines: annotations.lines,
                });
                setSelectedId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, annotations, setAnnotations]);

    // Helper function to get coordinates from mouse or touch event
    const getEventCoordinates = (e: any): { x: number; y: number } => {
        if (e.evt && e.evt.touches && e.evt.touches.length > 0) {
            // Touch event from Konva
            const touch = e.evt.touches[0];
            const stage = stageRef.current;
            if (stage) {
                const transform = stage.getAbsoluteTransform().copy();
                transform.invert();
                const point = transform.point({
                    x: touch.clientX - stage.container().getBoundingClientRect().left,
                    y: touch.clientY - stage.container().getBoundingClientRect().top,
                });
                return point;
            }
        }
        // Mouse event or fallback
        return stageRef.current?.getPointerPosition() || { x: 0, y: 0 };
    };

    const handlePointerDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        // Prevent default touch behavior to avoid scrolling
        if (e.evt && 'touches' in e.evt) {
            e.evt.preventDefault();
        }

        const pos = getEventCoordinates(e);
        if (!pos || !tool) return;

        const pageSize = getPageSize();

        if (tool === 'pencil' || tool === 'eraser') {
            setIsDrawing(true);
            // Convert to percentage immediately
            const percentagePos = positionToPercentage(pos, pageSize);
            setCurrentPoints([percentagePos.x, percentagePos.y]);
        } else if (tool === 'text-note') {
            // Convert to percentage for storage
            const percentagePos = positionToPercentage(pos, pageSize);
            
            // Clamp initial position to prevent going off-screen
            const estimatedWidthPercent = 10;
            const estimatedHeightPercent = 10;
            const clampedX = Math.max(0, Math.min(percentagePos.x, 100 - estimatedWidthPercent));
            const clampedY = Math.max(0, Math.min(percentagePos.y, 100 - estimatedHeightPercent));
            
            const text: TextElement = {
                id: `text_${Date.now()}`,
                tool,
                x: clampedX,
                y: clampedY,
                text: '',
                fontSize: 16,
                fill: '#000000',
            };
            setAnnotations({
                ...annotations,
                texts: [...annotations.texts, text],
            });
        } else if (tool === 'sticky-note') {
            // Convert to percentage for storage
            const percentagePos = positionToPercentage(pos, pageSize);
            
            // Clamp initial position to prevent going off-screen
            const estimatedWidthPercent = 15;
            const estimatedHeightPercent = 20;
            const clampedX = Math.max(0, Math.min(percentagePos.x, 100 - estimatedWidthPercent));
            const clampedY = Math.max(0, Math.min(percentagePos.y, 100 - estimatedHeightPercent));
            
            const note: StickyNoteElement = {
                id: `sticky_${Date.now()}`,
                tool,
                x: clampedX,
                y: clampedY,
                text: '',
                fontSize: 16,
                fill: '#000000',
            };
            setAnnotations({
                ...annotations,
                stickyNotes: [...annotations.stickyNotes, note],
            });
        }
    };

    const handlePointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !tool || !['pencil', 'eraser'].includes(tool)) return;
        
        // Prevent default touch behavior to avoid scrolling
        if (e.evt && 'touches' in e.evt) {
            e.evt.preventDefault();
        }

        const pos = getEventCoordinates(e);
        if (!pos) return;
        
        const pageSize = getPageSize();
        const percentagePos = positionToPercentage(pos, pageSize);
        setCurrentPoints(prev => [...prev, percentagePos.x, percentagePos.y]);
    };

    const handlePointerUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        // Prevent default touch behavior
        if (e.evt && ('touches' in e.evt || 'changedTouches' in e.evt)) {
            e.evt.preventDefault();
        }

        if (isDrawing && currentPoints.length > 2) {
            const pageSize = getPageSize();
            const scaleFactor = Math.min(pageSize.width / 595, pageSize.height / 842); // Scale based on A4 reference
            const baseStrokeWidth = tool === 'eraser' ? 10 : 2;
            const scaledStrokeWidth = Math.max(1, baseStrokeWidth * scaleFactor); // Minimum 1px

            const newLine: LineElement = {
                id: `line_${Date.now()}`,
                tool: tool as 'pencil' | 'eraser',
                points: currentPoints, // Already in percentage
                stroke: tool === 'eraser' ? '#ffffff' : '#ff0000',
                strokeWidth: scaledStrokeWidth,
                compositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
            };
            setAnnotations({
                ...annotations,
                lines: [...annotations.lines, newLine],
            });
        }
        setIsDrawing(false);
        setCurrentPoints([]);
    };

    return (
        <>
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                className="absolute top-0 left-0 z-40 annotation-canvas drawing-surface"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                style={{
                    // backgroundColor: 'rgba(255,0,0,0.1)',
                    pointerEvents: tool ? 'auto' : 'none',
                    touchAction: 'none', // Prevent default touch behaviors like scrolling and zooming
                }}
            >
                <Layer>
                    {annotations.lines.map(line => {
                        // Convert percentage points to pixel points for display
                        const pageSize = getPageSize();
                        const pixelPoints = linePointsToPixels(line.points, pageSize);
                        
                        return (
                            <Line
                                key={line.id}
                                points={pixelPoints}
                                stroke={line.stroke}
                                strokeWidth={line.strokeWidth}
                                tension={0.5}
                                lineCap="round"
                                globalCompositeOperation={(line.compositeOperation || 'source-over') as GlobalCompositeOperation}
                            />
                        );
                    })}

                    {isDrawing && currentPoints.length > 0 && (
                        <Line
                            points={linePointsToPixels(currentPoints, getPageSize())}
                            stroke={tool === 'eraser' ? '#ffffff' : '#ff0000'}
                            strokeWidth={(() => {
                                const pageSize = getPageSize();
                                const scaleFactor = Math.min(pageSize.width / 595, pageSize.height / 842);
                                const baseStrokeWidth = tool === 'eraser' ? 10 : 2;
                                return Math.max(1, baseStrokeWidth * scaleFactor);
                            })()}
                            tension={0.5}
                            lineCap="round"
                            globalCompositeOperation={tool === 'eraser' ? 'destination-out' : 'source-over'}
                        />
                    )}

                </Layer>
            </Stage>

            {annotations.texts.map(textNote => {
                // Convert percentage position to pixel position for display
                const pageSize = getPageSize();
                const pixelPos = positionToPixels({ x: textNote.x, y: textNote.y }, pageSize);
                const pixelDimensions = dimensionsToPixels({ 
                    width: textNote.width, 
                    height: textNote.height 
                }, pageSize);
                const scaledFontSize = getScaledFontSize(textNote.fontSize, pageSize);
                
                return (
                    <div
                        key={textNote.id}
                        style={{
                            position: 'absolute',
                            top: pixelPos.y,
                            left: pixelPos.x,
                            zIndex: 50,
                            cursor: 'move',
                            color: 'red',
                            fontSize: `${scaledFontSize}px`,
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection
                            setSelectedId(textNote.id);
                            const startX = e.clientX;
                            const startY = e.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';

                            const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
                                const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
                                const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
                                
                                const dx = clientX - startX;
                                const dy = clientY - startY;

                                // Convert the movement to percentage
                                const pageSize = getPageSize();
                                const dxPercent = (dx / pageSize.width) * 100;
                                const dyPercent = (dy / pageSize.height) * 100;

                                // Calculate new position
                                let newX = textNote.x + dxPercent;
                                let newY = textNote.y + dyPercent;

                                // Clamp position to prevent going off-screen
                                // Assuming text note width is ~20% and height is ~10% when not specified
                                const estimatedWidthPercent = textNote.width || 20;
                                const estimatedHeightPercent = textNote.height || 10;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                setAnnotations({
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            x: newX, 
                                            y: newY 
                                        } : t
                                    ),
                                });
                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                document.removeEventListener('mousemove', handleMove as EventListener);
                                document.removeEventListener('mouseup', handleEnd);
                                document.removeEventListener('touchmove', handleMove as EventListener);
                                document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('mousemove', handleMove as EventListener);
                            document.addEventListener('mouseup', handleEnd);
                            document.addEventListener('touchmove', handleMove as EventListener);
                            document.addEventListener('touchend', handleEnd);
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection
                            setSelectedId(textNote.id);
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';

                            const handleMove = (moveEvent: TouchEvent) => {
                                moveEvent.preventDefault(); // Prevent scrolling
                                const clientX = moveEvent.touches[0].clientX;
                                const clientY = moveEvent.touches[0].clientY;
                                
                                const dx = clientX - startX;
                                const dy = clientY - startY;

                                // Convert the movement to percentage
                                const pageSize = getPageSize();
                                const dxPercent = (dx / pageSize.width) * 100;
                                const dyPercent = (dy / pageSize.height) * 100;

                                // Calculate new position
                                let newX = textNote.x + dxPercent;
                                let newY = textNote.y + dyPercent;

                                // Clamp position to prevent going off-screen
                                // Assuming text note width is ~20% and height is ~10% when not specified
                                const estimatedWidthPercent = textNote.width || 20;
                                const estimatedHeightPercent = textNote.height || 10;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                setAnnotations({
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            x: newX, 
                                            y: newY 
                                        } : t
                                    ),
                                });
                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                document.removeEventListener('touchmove', handleMove);
                                document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('touchmove', handleMove);
                            document.addEventListener('touchend', handleEnd);
                        }}
                    >
                        <TextNote
                            content={textNote.text}
                            width={pixelDimensions.width}
                            height={pixelDimensions.height}
                            onChange={(val) => {
                                setAnnotations({
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { ...t, text: val } : t
                                    ),
                                });
                            }}
                            onResize={(w, h) => {
                                // Convert pixel dimensions back to percentage for storage
                                const pageSize = getPageSize();
                                const percentageDimensions = dimensionsToPercentage({ width: w, height: h }, pageSize);
                                setAnnotations({
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            width: percentageDimensions.width, 
                                            height: percentageDimensions.height 
                                        } : t
                                    ),
                                });
                            }}
                            onClick={() => setSelectedId(textNote.id)}
                            isSelected={selectedId === textNote.id}
                        />
                    </div>
                );
            })}

            {annotations.stickyNotes.map(note => {
                // Convert percentage position to pixel position for display
                const pageSize = getPageSize();
                const pixelPos = positionToPixels({ x: note.x, y: note.y }, pageSize);
                const scaleFactor = Math.min(pageSize.width / 595 * 0.5, pageSize.height / 842 * 0.5); // Scale based on A4 reference
                const scaledFontSize = getScaledFontSize(note.fontSize, pageSize);
                
                return (
                    <div
                        key={note.id}
                        style={{
                            position: 'absolute',
                            top: pixelPos.y,
                            left: pixelPos.x,
                            zIndex: 50,
                            cursor: 'move',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection
                            setSelectedId(note.id);
                            const startX = e.clientX;
                            const startY = e.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';

                            const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
                                const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
                                const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
                                
                                const dx = clientX - startX;
                                const dy = clientY - startY;

                                // Convert the movement to percentage
                                const pageSize = getPageSize();
                                const dxPercent = (dx / pageSize.width) * 100;
                                const dyPercent = (dy / pageSize.height) * 100;

                                // Calculate new position
                                let newX = note.x + dxPercent;
                                let newY = note.y + dyPercent;

                                // Clamp position to prevent going off-screen
                                // Sticky notes are typically around 15% width and 20% height
                                const estimatedWidthPercent = 15;
                                const estimatedHeightPercent = 20;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                setAnnotations({
                                    ...annotations,
                                    stickyNotes: annotations.stickyNotes.map((s) =>
                                        s.id === note.id
                                            ? { 
                                                ...s, 
                                                x: newX, 
                                                y: newY 
                                            }
                                            : s
                                    ),
                                });

                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                document.removeEventListener('mousemove', handleMove as EventListener);
                                document.removeEventListener('mouseup', handleEnd);
                                document.removeEventListener('touchmove', handleMove as EventListener);
                                document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('mousemove', handleMove as EventListener);
                            document.addEventListener('mouseup', handleEnd);
                            document.addEventListener('touchmove', handleMove as EventListener);
                            document.addEventListener('touchend', handleEnd);
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection
                            setSelectedId(note.id);
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';

                            const handleMove = (moveEvent: TouchEvent) => {
                                moveEvent.preventDefault(); // Prevent scrolling
                                const clientX = moveEvent.touches[0].clientX;
                                const clientY = moveEvent.touches[0].clientY;
                                
                                const dx = clientX - startX;
                                const dy = clientY - startY;

                                // Convert the movement to percentage
                                const pageSize = getPageSize();
                                const dxPercent = (dx / pageSize.width) * 100;
                                const dyPercent = (dy / pageSize.height) * 100;

                                // Calculate new position
                                let newX = note.x + dxPercent;
                                let newY = note.y + dyPercent;

                                // Clamp position to prevent going off-screen
                                // Sticky notes are typically around 15% width and 20% height
                                const estimatedWidthPercent = 15;
                                const estimatedHeightPercent = 20;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                setAnnotations({
                                    ...annotations,
                                    stickyNotes: annotations.stickyNotes.map((s) =>
                                        s.id === note.id
                                            ? { 
                                                ...s, 
                                                x: newX, 
                                                y: newY 
                                            }
                                            : s
                                    ),
                                });

                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                document.removeEventListener('touchmove', handleMove);
                                document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('touchmove', handleMove);
                            document.addEventListener('touchend', handleEnd);
                        }}
                    >
                        <StickyNote
                            content={note.text}
                            scaleFactor={scaleFactor}
                            fontSize={scaledFontSize}
                            onChange={(val: any) => {
                                setAnnotations({
                                    ...annotations,
                                    stickyNotes: annotations.stickyNotes.map(s =>
                                        s.id === note.id ? { ...s, text: val } : s
                                    ),
                                });
                            }}
                            onClick={() => setSelectedId(note.id)}
                            isSelected={selectedId === note.id}
                        />
                    </div >
                );
            })}
        </>
    );
};

export default AnnotationLayer;