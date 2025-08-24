import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import Konva from 'konva';
import StickyNote from '@dashboard/lecturer/course/components/StickyNote';
import TextNote from '@dashboard/lecturer/course/components/TextNote';

export interface LineElement {
    id: string;
    tool: 'pencil' | 'eraser';
    points: number[];
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

        if (tool === 'pencil' || tool === 'eraser') {
            setIsDrawing(true);
            setCurrentPoints([pos.x, pos.y]);
        } else if (tool === 'text-note') {
            const text: TextElement = {
                id: `text_${Date.now()}`,
                tool,
                x: pos.x,
                y: pos.y,
                text: '',
                fontSize: 16,
                fill: '#000000',
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

                </Layer>
            </Stage>

            {annotations.texts.map(textNote => (
                <div
                    key={textNote.id}
                    style={{
                        position: 'absolute',
                        top: textNote.y,
                        left: textNote.x,
                        zIndex: 50,
                        cursor: 'move',
                        color: 'red',
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(textNote.id);
                        const startX = e.clientX;
                        const startY = e.clientY;

                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            const dx = moveEvent.clientX - startX;
                            const dy = moveEvent.clientY - startY;

                            setAnnotations({
                                ...annotations,
                                texts: annotations.texts.map(t =>
                                    t.id === textNote.id ? { ...t, x: textNote.x + dx, y: textNote.y + dy } : t
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
                        width={textNote.width}
                        height={textNote.height}
                        onChange={(val) => {
                            setAnnotations({
                                ...annotations,
                                texts: annotations.texts.map(t =>
                                    t.id === textNote.id ? { ...t, text: val } : t
                                ),
                            });
                        }}
                        onResize={(w, h) => {
                            setAnnotations({
                                ...annotations,
                                texts: annotations.texts.map(t =>
                                    t.id === textNote.id ? { ...t, width: w, height: h } : t
                                ),
                            });
                        }}
                        onClick={() => setSelectedId(textNote.id)}
                        isSelected={selectedId === textNote.id}
                    />
                </div>
            ))}

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