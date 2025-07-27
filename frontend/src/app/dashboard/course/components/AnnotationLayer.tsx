import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import Konva from 'konva';
import StickyNote from '@dashboard/course/components/StickyNote';

export interface LineElement {
    id: string;
    tool: 'pencil' | 'eraser';
    points: number[];
    stroke: string;
    strokeWidth: number;
    compositeOperation?: string;
    page: number;
}

export interface TextElement {
    id: string;
    tool: 'text-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    page: number;
}

export interface StickyNoteElement {
    id: string;
    tool: 'sticky-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    page: number;
}

type Tool = 'pencil' | 'eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

export interface AnnotationLayerProps {
    page: number;
    annotations: {
        page: number;
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
        }

        return () => {
            if (pageCanvas) {
                observer.unobserve(pageCanvas);
            }
        };
    }, [page]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' && selectedId) {
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

        if (tool === 'pencil' || tool === 'eraser') {
            setIsDrawing(true);
            setCurrentPoints([pos.x, pos.y]);
        } else if (tool === 'text-note') {
            const text: TextElement = {
                id: `text_${Date.now()}`,
                tool,
                x: pos.x,
                y: pos.y,
                text: 'New note',
                fontSize: 16,
                fill: '#000000',
                page,
            };
            setAnnotations({
                ...annotations,
                texts: [...annotations.texts, text],
            });
        } else if (tool === 'sticky-note') {
            const note: StickyNoteElement = {
                id: `sticky_${Date.now()}`,
                tool,
                x: pos.x,
                y: pos.y,
                text: '',
                fontSize: 16,
                fill: '#000000',
                page,
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
        setCurrentPoints(prev => [...prev, pos.x, pos.y]);
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPoints.length > 2) {
            const newLine: LineElement = {
                id: `line_${Date.now()}`,
                tool: tool as 'pencil' | 'eraser',
                points: currentPoints,
                stroke: tool === 'eraser' ? '#ffffff' : '#ff0000',
                strokeWidth: tool === 'eraser' ? 10 : 2,
                compositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
                page,
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
                    {annotations.lines.map(line => (
                        <Line
                            key={line.id}
                            points={line.points}
                            stroke={line.stroke}
                            strokeWidth={line.strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            globalCompositeOperation={(line.compositeOperation || 'source-over') as GlobalCompositeOperation}
                        />
                    ))}

                    {isDrawing && currentPoints.length > 0 && (
                        <Line
                            points={currentPoints}
                            stroke={tool === 'eraser' ? '#ffffff' : '#ff0000'}
                            strokeWidth={tool === 'eraser' ? 10 : 2}
                            tension={0.5}
                            lineCap="round"
                            globalCompositeOperation={tool === 'eraser' ? 'destination-out' : 'source-over'}
                        />
                    )}

                    {annotations.texts.map(textNote => (
                        <Text
                            key={textNote.id}
                            x={textNote.x}
                            y={textNote.y}
                            text={textNote.text}
                            fontSize={textNote.fontSize}
                            fill={textNote.fill}
                            draggable
                            onDragEnd={(e) => {
                                const { x, y } = e.target.position();
                                setAnnotations({
                                    ...annotations,
                                    texts: annotations.texts.map(t =>
                                        t.id === textNote.id ? { ...t, x, y } : t
                                    ),
                                });
                            }}
                            onClick={() => setSelectedId(textNote.id)}
                        />
                    ))}
                </Layer>
            </Stage>

            {annotations.stickyNotes.map(note => (
                <div
                    key={note.id}
                    style={{
                        position: 'absolute',
                        top: note.y,
                        left: note.x,
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

                            setAnnotations({
                                ...annotations,
                                stickyNotes: annotations.stickyNotes.map((s) =>
                                    s.id === note.id
                                        ? { ...s, x: note.x + dx, y: note.y + dy }
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
            ))}
        </>
    );
};

export default AnnotationLayer;