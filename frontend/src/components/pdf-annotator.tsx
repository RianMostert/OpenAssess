import React, { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { Stage, Layer, Text, Line } from 'react-konva';
import Konva from 'konva';
import ToolBar from './pdf-annotator-bar';

import StickyNote from './sticky-note';

GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

interface PdfAnnotatorProps {
    file: File | string | null;
    lines: LineElement[];
    texts: TextElement[];
    stickyNotes: StickyNoteElement[];
    setLines: React.Dispatch<React.SetStateAction<LineElement[]>>;
    setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
    setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteElement[]>>;
}

interface LineElement {
    id: string;
    tool: 'pencil' | 'eraser';
    points: number[];
    stroke: string;
    strokeWidth: number;
    compositeOperation?: string;
    page: number;
}

interface TextElement {
    id: string;
    tool: 'text-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    page: number;
}

interface StickyNoteElement {
    id: string;
    tool: 'sticky-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    page: number;
}

type Tool = 'highlighter' | 'pencil' | 'eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

const PdfAnnotator: React.FC<PdfAnnotatorProps> = ({ file, lines, setLines, texts, setTexts, stickyNotes, setStickyNotes }) => {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = React.useState<number | null>(null);
    const [pageNumber, setPageNumber] = React.useState<number>(1);
    const [scale, setScale] = React.useState<number>(1.0);
    const [tool, setTool] = React.useState<Tool | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [redoStack, setRedoStack] = useState<any[]>([]);

    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [currentPoints, setCurrentPoints] = useState<number[]>([]);
    const [currentColor, setCurrentColor] = useState<string>('#ff0000');
    const [containerWidth, setContainerWidth] = useState(0);
    const [pageNaturalWidth, setPageNaturalWidth] = useState(0);
    const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });


    // useEffect(() => {
    //     const updateSize = () => {
    //         if (pdfRef.current) {
    //             setContainerWidth(pdfRef.current.clientWidth);
    //         }
    //     };

    //     updateSize(); // Initial call
    //     window.addEventListener('resize', updateSize);
    //     return () => window.removeEventListener('resize', updateSize);
    // }, []);

    // const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    //     width: 0,
    //     height: 0
    // });

    useEffect(() => {
        // maybe delete on backspace as well but will need to check if the text is selected
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
                const activeEl = document.activeElement as HTMLElement;
                if (activeEl && activeEl.tagName === 'TEXTAREA') {
                    activeEl.blur();
                }
                e.preventDefault();
                e.stopPropagation();
                setTexts(prev => prev.filter(t => t.id !== selectedId));
                setStickyNotes(prev => prev.filter(s => s.id !== selectedId));
                setSelectedId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId]);

    function isPointNearEraser(eraserPoints: number[], point: { x: number, y: number }, threshold: number): boolean {
        for (let i = 0; i < eraserPoints.length; i += 2) {
            const ex = eraserPoints[i];
            const ey = eraserPoints[i + 1];
            const dx = ex - point.x;
            const dy = ey - point.y;
            if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
                return true;
            }
        }
        return false;
    }


    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        if (tool === 'pencil' || tool === 'eraser') {
            setIsDrawing(true);
            setCurrentPoints([pos.x, pos.y]);
            pushToHistory();
        } else if (tool === 'text-note') {
            const newText: TextElement = {
                id: `text_${Date.now()}`,
                tool: 'text-note',
                x: pos.x,
                y: pos.y,
                text: 'New note',
                fontSize: 16,
                fill: currentColor,
                page: pageNumber
            };

            pushToHistory();
            setTexts(prev => [...prev, newText]);
        } else if (tool === 'sticky-note') {
            const newStickyNote: StickyNoteElement = {
                id: `sticky_${Date.now()}`,
                tool: 'sticky-note',
                x: pos.x,
                y: pos.y,
                text: '',
                fontSize: 16,
                fill: currentColor,
                page: pageNumber
            };

            pushToHistory();
            setStickyNotes(prev => [...prev, newStickyNote]);
        }
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;

        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (point) {
            setCurrentPoints(prev => [...prev, point.x, point.y]);
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;

        setIsDrawing(false);

        if (currentPoints.length >= 4) {
            if (tool === 'eraser') {
                const threshold = 15; // adjust based on strokeWidth
                const newLines = lines.flatMap(line => {
                    if (line.tool !== 'pencil' || line.page !== pageNumber) return [line];

                    const segments: number[][] = [];
                    let currentSegment: number[] = [];

                    for (let i = 0; i < line.points.length; i += 2) {
                        const point = { x: line.points[i], y: line.points[i + 1] };
                        const isErased = isPointNearEraser(currentPoints, point, threshold);

                        if (isErased) {
                            if (currentSegment.length >= 4) {
                                segments.push(currentSegment);
                            }
                            currentSegment = [];
                        } else {
                            currentSegment.push(point.x, point.y);
                        }
                    }

                    if (currentSegment.length >= 4) {
                        segments.push(currentSegment);
                    }

                    return segments.map((seg) => ({
                        ...line,
                        id: `line_${Date.now()}_${Math.random()}`,
                        points: seg
                    }));
                });

                setLines(newLines);
            } else {
                const newLine: LineElement = {
                    points: currentPoints,
                    stroke: currentColor,
                    strokeWidth: 2,
                    id: `line_${Date.now()}`,
                    compositeOperation: 'source-over',
                    tool: 'pencil',
                    page: pageNumber
                };
                setLines(prev => [...prev, newLine]);
            }

        }

        setCurrentPoints([]);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setRedoStack(rs => [...rs, { lines, texts, stickyNotes }]);
        setLines(prev.lines);
        setTexts(prev.texts);
        setStickyNotes(prev.stickyNotes);
        setHistory(h => h.slice(0, h.length - 1));
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(h => [...h, { lines, texts, stickyNotes }]);
        setLines(next.lines);
        setTexts(next.texts);
        setStickyNotes(next.stickyNotes);
        setRedoStack(rs => rs.slice(0, rs.length - 1));
    };

    const pushToHistory = () => {
        setHistory(prev => [...prev, { lines, texts, stickyNotes }]);
        setRedoStack([]); // Clear redo on new action
    };

    const handleStickyDrag = (
        e: React.MouseEvent,
        stickyNoteId: string
    ) => {
        e.stopPropagation();

        const container = pdfRef.current;
        if (!container) return;

        const startX = e.clientX;
        const startY = e.clientY;
        let dragged = false;

        const stickyNote = stickyNotes.find((s) => s.id === stickyNoteId);
        if (!stickyNote) return;

        const initialX = stickyNote.x;
        const initialY = stickyNote.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            // If Sticky was dragged, then dont handle mousedown event
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                dragged = true;
            }

            // adjust by container offset
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;

            setStickyNotes((prev) =>
                prev.map((s) =>
                    s.id === stickyNoteId
                        ? { ...s, x: newX, y: newY }
                        : s
                )
            );
        };

        const handleMouseUp = () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    }

    useEffect(() => {
        if (pdfRef.current) {
            pdfRef.current.scrollTop = 0;
        }
        setLines([]);
        setTexts([]);
        setStickyNotes([]);
        setHistory([]);
    }, [file]);

    // useEffect(() => {
    //     setFile('/rw244.pdf');
    // }, []);

    return (
        <div className="flex-1 flex-col overflow-hidden items-center justify-center">
            <ToolBar tool={tool} setTool={setTool} onUndo={handleUndo} onRedo={handleRedo} />
            {file ? (
                <div className="relative flex items-center justify-center" ref={pdfRef}>
                    <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="border border-zinc-800 rounded-lg overflow-hidden"
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            onRenderSuccess={(page) => {
                                setPageNaturalWidth(page.view[2]);
                                setPageSize({ width: page.width, height: page.height });
                            }} />
                    </Document>
                    <Stage
                        width={pageSize.width}
                        height={pageSize.height}
                        onMouseDown={handleMouseDown}
                        onMousemove={handleMouseMove}
                        onMouseup={handleMouseUp}
                        className='absolute'
                    >
                        <Layer>
                            {/* Render saved lines */}
                            {lines.map((line, index) => (
                                <Line
                                    key={line.id}
                                    id={line.id}
                                    points={line.points}
                                    stroke={line.stroke}
                                    strokeWidth={line.strokeWidth}
                                    tension={0.5}
                                    lineCap="round"
                                    globalCompositeOperation={(line.compositeOperation as GlobalCompositeOperation) || 'source-over' as GlobalCompositeOperation}
                                />
                            ))}
                            {/* Render the in-progress line */}
                            {isDrawing && currentPoints.length > 0 && (
                                <Line
                                    points={currentPoints}
                                    stroke={tool === 'eraser' ? 'white' : currentColor}
                                    strokeWidth={tool === 'eraser' ? 10 : 2}
                                    tension={0.5}
                                    lineCap="round"
                                    globalCompositeOperation={tool === 'eraser' ? 'destination-out' : 'source-over'}
                                />
                            )}
                            {texts.map((textNote) => (
                                <Text
                                    key={textNote.id}
                                    x={textNote.x}
                                    y={textNote.y}
                                    text={textNote.text}
                                    fontSize={textNote.fontSize}
                                    fill={textNote.fill}
                                    draggable
                                    width={200} // set to whatever max width you want
                                    wrap="word" // or 'char' for stricter wrapping
                                    onDragEnd={(e) => {
                                        const { x, y } = e.target.position();
                                        setTexts((prev) =>
                                            prev.map((t) =>
                                                t.id === textNote.id ? { ...t, x, y } : t
                                            )
                                        );
                                    }}
                                    onClick={() => setSelectedId(textNote.id)}
                                    onDblClick={(e) => {
                                        const stage = e.target.getStage();
                                        const absPos = e.target.getAbsolutePosition();
                                        const id = textNote.id;

                                        const textArea = document.createElement('textarea');
                                        textArea.value = textNote.text === 'New note' ? '' : textNote.text;
                                        document.body.appendChild(textArea);

                                        textArea.style.position = 'absolute';
                                        textArea.style.top = `${absPos.y + 120}px`;
                                        textArea.style.left = `${absPos.x + 340}px`;
                                        textArea.style.fontSize = `${textNote.fontSize}px`;
                                        textArea.style.background = '#ffffff';
                                        textArea.style.width = '200px';
                                        textArea.style.whiteSpace = 'pre-wrap';
                                        textArea.focus();

                                        textArea.onblur = () => {
                                            const updatedText = textArea.value || 'New note';
                                            setTexts((prev) =>
                                                prev.map((t) =>
                                                    t.id === id ? { ...t, text: updatedText } : t
                                                )
                                            );
                                            document.body.removeChild(textArea);
                                        };

                                        textArea.onkeydown = (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                textArea.blur();
                                            }
                                        };
                                    }}
                                />
                            ))}
                        </Layer>
                    </Stage>
                    {stickyNotes.map((stickyNote) => (
                        <div
                            key={stickyNote.id}
                            style={{
                                position: 'absolute',
                                top: stickyNote.y,
                                left: stickyNote.x,
                                zIndex: 10,
                                cursor: 'move',
                            }}
                            onMouseDown={(e) => handleStickyDrag(e, stickyNote.id)}
                        >
                            <StickyNote
                                content={stickyNote.text}
                                onChange={(val) => {
                                    setStickyNotes((prev) =>
                                        prev.map((s) => (s.id === stickyNote.id ? { ...s, text: val } : s))
                                    );
                                }}
                                onClick={() => setSelectedId(stickyNote.id)}
                                isSelected={selectedId === stickyNote.id}
                            />
                        </div>
                    ))}

                </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No PDF file selected</p>
                </div>
            )}
        </div>
    );
}

export default PdfAnnotator;
