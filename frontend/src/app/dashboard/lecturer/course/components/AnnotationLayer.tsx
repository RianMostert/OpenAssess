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
    x: number; // Now stored as percentage
    y: number; // Now stored as percentage
    text: string;
    fontSize: number;
    fill: string;
    width?: number; // Now stored as percentage
    height?: number; // Now stored as percentage
}

export interface StickyNoteElement {
    id: string;
    tool: 'sticky-note';
    x: number; // Now stored as percentage
    y: number; // Now stored as percentage
    text: string;
    fontSize: number;
    fill: string;
    width?: number; // Now stored as percentage (for expanded state)
    height?: number; // Now stored as percentage (for expanded state)
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

    const getPointer = (e: Konva.KonvaEventObject<any>) => stageRef.current?.getPointerPosition();

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const pos = getPointer(e);
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
            const text: TextElement = {
                id: `text_${Date.now()}`,
                tool,
                x: percentagePos.x,
                y: percentagePos.y,
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
            const note: StickyNoteElement = {
                id: `sticky_${Date.now()}`,
                tool,
                x: percentagePos.x,
                y: percentagePos.y,
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

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !tool || !['pencil', 'eraser'].includes(tool)) return;
        const pos = getPointer(e);
        if (!pos) return;
        
        const pageSize = getPageSize();
        const percentagePos = positionToPercentage(pos, pageSize);
        setCurrentPoints(prev => [...prev, percentagePos.x, percentagePos.y]);
    };

    const handleMouseUp = () => {
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
                className="absolute top-0 left-0 z-40"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{
                    // backgroundColor: 'rgba(255,0,0,0.1)',
                    pointerEvents: tool ? 'auto' : 'none',
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
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedId(textNote.id);
                            const startX = e.clientX;
                            const startY = e.clientY;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const dx = moveEvent.clientX - startX;
                                const dy = moveEvent.clientY - startY;

                                // Convert the movement to percentage
                                const pageSize = getPageSize();
                                const dxPercent = (dx / pageSize.width) * 100;
                                const dyPercent = (dy / pageSize.height) * 100;

                                setAnnotations({
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { 
                                            ...t, 
                                            x: textNote.x + dxPercent, 
                                            y: textNote.y + dyPercent 
                                        } : t
                                    ),
                                });
                            };

                            const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
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
                const scaleFactor = Math.min(pageSize.width / 595, pageSize.height / 842); // Scale based on A4 reference
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
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedId(note.id);
                            const startX = e.clientX;
                            const startY = e.clientY;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const dx = moveEvent.clientX - startX;
                                const dy = moveEvent.clientY - startY;

                                // Convert the movement to percentage
                                const pageSize = getPageSize();
                                const dxPercent = (dx / pageSize.width) * 100;
                                const dyPercent = (dy / pageSize.height) * 100;

                                setAnnotations({
                                    ...annotations,
                                    stickyNotes: annotations.stickyNotes.map((s) =>
                                        s.id === note.id
                                            ? { 
                                                ...s, 
                                                x: note.x + dxPercent, 
                                                y: note.y + dyPercent 
                                            }
                                            : s
                                    ),
                                });

                            };

                            const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
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