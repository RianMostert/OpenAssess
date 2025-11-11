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
    tool: 'pencil' | 'eraser' | 'fine-eraser';
    points: number[]; // Now stored as percentage coordinates
    stroke: string;
    strokeWidth: number;
    globalCompositeOperation?: 'source-over' | 'destination-out';
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

type Tool = 'pencil' | 'eraser' | 'fine-eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

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
    onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    page,
    annotations,
    setAnnotations,
    tool,
    containerRef,
    rendered,
    onUndoRedoChange,
}) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<number[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Undo/Redo state
    const [history, setHistory] = useState<AnnotationLayerProps['annotations'][]>([annotations]);
    const [historyIndex, setHistoryIndex] = useState(0);

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

    // Delete annotation function (keyboard + button)
    const deleteSelectedAnnotation = () => {
        if (!selectedId) return;
        
        const newAnnotations = {
            ...annotations,
            stickyNotes: annotations.stickyNotes.filter(note => note.id !== selectedId),
            texts: annotations.texts.filter(text => text.id !== selectedId),
            lines: annotations.lines,
        };
        addToHistory(newAnnotations);
        setSelectedId(null);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isWindowsDelete = e.key === 'Delete';
            const isMacDelete = e.metaKey && e.key === 'Backspace';
            if ((isWindowsDelete || isMacDelete) && selectedId) {
                deleteSelectedAnnotation();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, annotations, setAnnotations]);

    // Notify parent about undo/redo state changes
    useEffect(() => {
        if (onUndoRedoChange) {
            const canUndo = historyIndex > 0;
            const canRedo = historyIndex < history.length - 1;
            onUndoRedoChange(canUndo, canRedo);
        }
    }, [historyIndex, history.length, onUndoRedoChange]);

    // Add new state to history and clear any "future" states
    const addToHistory = (newAnnotations: AnnotationLayerProps['annotations']) => {
        // Remove any states after current index (redo is no longer possible)
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);
        
        // Limit history to prevent memory issues (keep last 50 states)
        const limitedHistory = newHistory.slice(-50);
        
        setHistory(limitedHistory);
        setHistoryIndex(limitedHistory.length - 1);
        setAnnotations(newAnnotations);
    };

    // Undo handler
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setAnnotations(history[newIndex]);
        }
    };

    // Redo handler
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setAnnotations(history[newIndex]);
        }
    };

    // Expose undo/redo to parent via tool prop
    useEffect(() => {
        if (tool === 'undo') {
            handleUndo();
        } else if (tool === 'redo') {
            handleRedo();
        }
    }, [tool]);

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

        if (tool === 'pencil' || tool === 'eraser' || tool === 'fine-eraser') {
            setIsDrawing(true);
            // Convert to percentage immediately
            const percentagePos = positionToPercentage(pos, pageSize);
            setCurrentPoints([percentagePos.x, percentagePos.y]);
        } else if (tool === 'text-note') {
            // Convert to percentage for storage
            const percentagePos = positionToPercentage(pos, pageSize);
            
            // Clamp initial position to prevent going off-screen
            const estimatedWidthPercent = 5;
            const estimatedHeightPercent = 5;
            const clampedX = Math.max(0, Math.min(percentagePos.x, 100 - estimatedWidthPercent));
            const clampedY = Math.max(0, Math.min(percentagePos.y, 100 - estimatedHeightPercent));
            
            const text: TextElement = {
                id: `text_${Date.now()}`,
                tool,
                x: clampedX,
                y: clampedY,
                text: '',
                fontSize: 20,
                fill: '#000000',
            };
            addToHistory({
                ...annotations,
                texts: [...annotations.texts, text],
            });
        } else if (tool === 'sticky-note') {
            // Convert to percentage for storage
            const percentagePos = positionToPercentage(pos, pageSize);
            
            // Calculate collapsed sticky note size in pixels then convert to percentage
            const scaleFactor = Math.min(pageSize.width / 595 * 0.5, pageSize.height / 842 * 0.5);
            const collapsedSize = Math.max(24, 40 * scaleFactor); // Same as StickyNote component
            
            // Convert pixel dimensions to percentage (use collapsed size for positioning)
            const estimatedWidthPercent = (collapsedSize / pageSize.width) * 100;
            const estimatedHeightPercent = (collapsedSize / pageSize.height) * 100;
            
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
            addToHistory({
                ...annotations,
                stickyNotes: [...annotations.stickyNotes, note],
            });
        }
    };

    const handlePointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !tool || !['pencil', 'eraser', 'fine-eraser'].includes(tool)) return;
        
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
            const baseStrokeWidth = (tool === 'eraser' || tool === 'fine-eraser') ? 10 : 2;
            const scaledStrokeWidth = Math.max(1, baseStrokeWidth * scaleFactor); // Minimum 1px

            if (tool === 'eraser') {
                // Regular eraser: Remove entire lines that intersect with the eraser path
                const eraserPath = currentPoints;
                const eraserWidth = scaledStrokeWidth;
                
                // Filter out lines that intersect with the eraser (including fine-eraser strokes)
                const remainingLines = annotations.lines.filter(line => {
                    // Don't erase eraser strokes or fine-eraser strokes
                    if (line.tool === 'eraser' || line.tool === 'fine-eraser') return true;
                    
                    return !doLinesIntersect(line.points, eraserPath, line.strokeWidth, eraserWidth, pageSize);
                });
                
                addToHistory({
                    ...annotations,
                    lines: remainingLines,
                });
            } else if (tool === 'fine-eraser') {
                // Fine eraser: Create a masking stroke that erases parts of drawings
                // This uses destination-out but ONLY affects the Konva layer, not the PDF below
                const newLine: LineElement = {
                    id: `fine-eraser_${Date.now()}`,
                    tool: 'fine-eraser',
                    points: currentPoints,
                    stroke: 'rgba(0,0,0,1)', // Color doesn't matter for destination-out
                    strokeWidth: scaledStrokeWidth,
                    globalCompositeOperation: 'destination-out',
                };
                addToHistory({
                    ...annotations,
                    lines: [...annotations.lines, newLine],
                });
            } else {
                // Pencil: Add a new drawing line
                const newLine: LineElement = {
                    id: `line_${Date.now()}`,
                    tool: 'pencil',
                    points: currentPoints, // Already in percentage
                    stroke: '#ff0000',
                    strokeWidth: scaledStrokeWidth,
                    globalCompositeOperation: 'source-over',
                };
                addToHistory({
                    ...annotations,
                    lines: [...annotations.lines, newLine],
                });
            }
        }
        setIsDrawing(false);
        setCurrentPoints([]);
    };
    
    // Helper function to check if two line paths intersect
    const doLinesIntersect = (
        line1Points: number[], 
        line2Points: number[], 
        line1Width: number, 
        line2Width: number,
        pageSize: { width: number; height: number }
    ): boolean => {
        // Convert percentage points to pixels for accurate intersection detection
        const line1Pixels = linePointsToPixels(line1Points, pageSize);
        const line2Pixels = linePointsToPixels(line2Points, pageSize);
        
        // Check if any segment of line1 intersects with any segment of line2
        // Using a simple distance-based approach with stroke width tolerance
        const threshold = (line1Width + line2Width) / 2;
        
        for (let i = 0; i < line1Pixels.length - 2; i += 2) {
            const x1 = line1Pixels[i];
            const y1 = line1Pixels[i + 1];
            
            for (let j = 0; j < line2Pixels.length - 2; j += 2) {
                const x2 = line2Pixels[j];
                const y2 = line2Pixels[j + 1];
                
                const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                
                if (distance < threshold) {
                    return true; // Lines intersect/overlap
                }
            }
        }
        
        return false;
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
                                globalCompositeOperation={line.globalCompositeOperation || 'source-over'}
                            />
                        );
                    })}

                    {isDrawing && currentPoints.length > 0 && (tool === 'pencil' || tool === 'fine-eraser') && (
                        <Line
                            points={linePointsToPixels(currentPoints, getPageSize())}
                            stroke={tool === 'fine-eraser' ? 'rgba(100,100,100,0.5)' : '#ff0000'}
                            strokeWidth={(() => {
                                const pageSize = getPageSize();
                                const scaleFactor = Math.min(pageSize.width / 595, pageSize.height / 842);
                                const baseWidth = (tool === 'fine-eraser') ? 10 : 2;
                                return Math.max(1, baseWidth * scaleFactor);
                            })()}
                            tension={0.5}
                            lineCap="round"
                            globalCompositeOperation={tool === 'fine-eraser' ? 'destination-out' : 'source-over'}
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
                            // Don't start dragging if clicking on the textarea
                            if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
                                return;
                            }
                            
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection
                            setSelectedId(textNote.id);
                            const startX = e.clientX;
                            const startY = e.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';
                            
                            // Prevent scrolling on the PDF container during drag
                            const pdfContainer = document.querySelector('.pdf-container');
                            if (pdfContainer) {
                                (pdfContainer as HTMLElement).style.overflow = 'hidden';
                            }

                            // Track the final position to add to history
                            let finalAnnotations = annotations;

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
                                // Use smaller buffer for better right-edge positioning
                                const estimatedWidthPercent = textNote.width || 5;
                                const estimatedHeightPercent = textNote.height || 5;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                finalAnnotations = {
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            x: newX, 
                                            y: newY 
                                        } : t
                                    ),
                                };
                                
                                setAnnotations(finalAnnotations);
                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                // Re-enable scrolling on the PDF container
                                const pdfContainer = document.querySelector('.pdf-container');
                                if (pdfContainer) {
                                    (pdfContainer as HTMLElement).style.overflow = '';
                                }
                                
                                // Add final position to history when drag ends
                                addToHistory(finalAnnotations);
                                
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
                            // Don't start dragging if touching the textarea
                            if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
                                return;
                            }
                            
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection and scrolling
                            setSelectedId(textNote.id);
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';
                            
                            // Prevent scrolling on the PDF container during drag
                            const pdfContainer = document.querySelector('.pdf-container');
                            if (pdfContainer) {
                                (pdfContainer as HTMLElement).style.overflow = 'hidden';
                            }

                            // Track the final position to add to history
                            let finalAnnotations = annotations;

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
                                // Use smaller buffer for better right-edge positioning
                                const estimatedWidthPercent = textNote.width || 5;
                                const estimatedHeightPercent = textNote.height || 5;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                finalAnnotations = {
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            x: newX, 
                                            y: newY 
                                        } : t
                                    ),
                                };
                                
                                setAnnotations(finalAnnotations);
                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                // Re-enable scrolling on the PDF container
                                const pdfContainer = document.querySelector('.pdf-container');
                                if (pdfContainer) {
                                    (pdfContainer as HTMLElement).style.overflow = '';
                                }
                                
                                // Add final position to history when drag ends
                                addToHistory(finalAnnotations);
                                
                                document.removeEventListener('touchmove', handleMove);
                                document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('touchmove', handleMove);
                            document.addEventListener('touchend', handleEnd);
                        }}
                    >
                        {/* Delete button for touch devices */}
                        {selectedId === textNote.id && (
                            <button
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    deleteSelectedAnnotation();
                                }}
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    deleteSelectedAnnotation();
                                }}
                                className="absolute -top-8 -right-8 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600 z-50"
                                style={{
                                    minWidth: '32px',
                                    minHeight: '32px',
                                }}
                                aria-label="Delete annotation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                            </button>
                        )}
                        <TextNote
                            content={textNote.text}
                            width={pixelDimensions.width}
                            height={pixelDimensions.height}
                            onChange={(val) => {
                                const newAnnotations = {
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { ...t, text: val } : t
                                    ),
                                };
                                // Use setAnnotations directly for real-time typing (will add to history on blur/unfocus)
                                setAnnotations(newAnnotations);
                            }}
                            onResize={(w, h) => {
                                // Convert pixel dimensions back to percentage for storage
                                const pageSize = getPageSize();
                                const percentageDimensions = dimensionsToPercentage({ width: w, height: h }, pageSize);
                                const newAnnotations = {
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            width: percentageDimensions.width, 
                                            height: percentageDimensions.height 
                                        } : t
                                    ),
                                };
                                // Add to history when resize completes
                                addToHistory(newAnnotations);
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
                            // Don't start dragging if clicking on the textarea
                            if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
                                return;
                            }
                            
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection
                            setSelectedId(note.id);
                            const startX = e.clientX;
                            const startY = e.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';
                            
                            // Prevent scrolling on the PDF container during drag
                            const pdfContainer = document.querySelector('.pdf-container');
                            if (pdfContainer) {
                                (pdfContainer as HTMLElement).style.overflow = 'hidden';
                            }

                            // Track the final position to add to history
                            let finalAnnotations = annotations;

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

                                // Calculate collapsed sticky note size (not expanded) for boundary
                                const scaleFactor = Math.min(pageSize.width / 595 * 0.5, pageSize.height / 842 * 0.5);
                                const collapsedSize = Math.max(24, 40 * scaleFactor);
                                const estimatedWidthPercent = (collapsedSize / pageSize.width) * 100;
                                const estimatedHeightPercent = (collapsedSize / pageSize.height) * 100;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                finalAnnotations = {
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
                                };
                                
                                setAnnotations(finalAnnotations);

                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                // Re-enable scrolling on the PDF container
                                const pdfContainer = document.querySelector('.pdf-container');
                                if (pdfContainer) {
                                    (pdfContainer as HTMLElement).style.overflow = '';
                                }
                                
                                // Add final position to history when drag ends
                                addToHistory(finalAnnotations);
                                
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
                            // Don't start dragging if touching the textarea
                            if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
                                return;
                            }
                            
                            e.stopPropagation();
                            e.preventDefault(); // Prevent text selection and scrolling
                            setSelectedId(note.id);
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;

                            // Prevent text selection during drag
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';
                            
                            // Prevent scrolling on the PDF container during drag
                            const pdfContainer = document.querySelector('.pdf-container');
                            if (pdfContainer) {
                                (pdfContainer as HTMLElement).style.overflow = 'hidden';
                            }

                            // Track the final position to add to history
                            let finalAnnotations = annotations;

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

                                // Calculate collapsed sticky note size (not expanded) for boundary
                                const scaleFactor = Math.min(pageSize.width / 595 * 0.5, pageSize.height / 842 * 0.5);
                                const collapsedSize = Math.max(24, 40 * scaleFactor);
                                const estimatedWidthPercent = (collapsedSize / pageSize.width) * 100;
                                const estimatedHeightPercent = (collapsedSize / pageSize.height) * 100;
                                
                                newX = Math.max(0, Math.min(newX, 100 - estimatedWidthPercent));
                                newY = Math.max(0, Math.min(newY, 100 - estimatedHeightPercent));

                                finalAnnotations = {
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
                                };
                                
                                setAnnotations(finalAnnotations);

                            };

                            const handleEnd = () => {
                                // Re-enable text selection
                                document.body.style.userSelect = '';
                                document.body.style.webkitUserSelect = '';
                                
                                // Re-enable scrolling on the PDF container
                                const pdfContainer = document.querySelector('.pdf-container');
                                if (pdfContainer) {
                                    (pdfContainer as HTMLElement).style.overflow = '';
                                }
                                
                                // Add final position to history when drag ends
                                addToHistory(finalAnnotations);
                                
                                document.removeEventListener('touchmove', handleMove);
                                document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('touchmove', handleMove);
                            document.addEventListener('touchend', handleEnd);
                        }}
                    >
                        {/* Delete button for touch devices */}
                        {selectedId === note.id && (
                            <button
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    deleteSelectedAnnotation();
                                }}
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    deleteSelectedAnnotation();
                                }}
                                className="absolute -top-8 -right-8 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600 z-50"
                                style={{
                                    minWidth: '32px',
                                    minHeight: '32px',
                                }}
                                aria-label="Delete annotation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                            </button>
                        )}
                        <StickyNote
                            content={note.text}
                            scaleFactor={scaleFactor}
                            fontSize={scaledFontSize}
                            onChange={(val: any) => {
                                const newAnnotations = {
                                    ...annotations,
                                    stickyNotes: annotations.stickyNotes.map(s =>
                                        s.id === note.id ? { ...s, text: val } : s
                                    ),
                                };
                                // Use setAnnotations directly for real-time typing
                                setAnnotations(newAnnotations);
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