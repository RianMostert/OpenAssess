import React, { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { Stage, Layer, Text, Line } from 'react-konva';
import Konva from 'konva';
import ToolBar from './pdf-annotator-bar';

GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

interface LineElement {
    id: string;
    tool: 'pencil' | 'eraser';
    points: number[];
    stroke: string;
    strokeWidth: number;
    compositeOperation?: string;
    page?: number;
}

interface TextElement {
    id: string;
    tool: 'text-note';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
    page?: number;
}

interface StickyNote {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
}

type Tool = 'highlighter' | 'pencil' | 'eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

const PdfAnnotator: React.FC = () => {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [file, setFile] = React.useState<File | string | null>(null);
    const [numPages, setNumPages] = React.useState<number | null>(null);
    const [pageNumber, setPageNumber] = React.useState<number>(1);
    const [scale, setScale] = React.useState<number>(1.0);
    const [tool, setTool] = React.useState<Tool | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [redoStack, setRedoStack] = useState<any[]>([]);

    const [lines, setLines] = useState<LineElement[]>([]);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [currentPoints, setCurrentPoints] = useState<number[]>([]);
    const [currentColor, setCurrentColor] = useState<string>('#ff0000');
    const [texts, setTexts] = useState<TextElement[]>([]);
    const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

    // const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    //     width: 0,
    //     height: 0
    // });

    useEffect(() => {
        // maybe delete on backspace as well but will need to check if the text is selected
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete') {
                setTexts(prev => prev.filter(t => t.id !== selectedId));
                setStickyNotes(prev => prev.filter(s => s.id !== selectedId));
                setSelectedId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId]);


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
                fill: currentColor
            };

            pushToHistory();
            setTexts(prev => [...prev, newText]);
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
            const newLine: LineElement = {
                points: currentPoints,
                stroke: tool === 'eraser' ? 'white' : currentColor,
                strokeWidth: tool === 'eraser' ? 20 : 2,
                id: `line_${Date.now()}`,
                compositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over'
            };

            setLines(prev => [...prev, newLine]);
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

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    }

    useEffect(() => {
        if (pdfRef.current) {
            pdfRef.current.scrollTop = 0;
        }
    }, []);

    useEffect(() => {
        setFile('/rw244.pdf');
    }, []);

    return (
        <div className="flex-1 flex-col overflow-hidden items-center justify-center">
            <ToolBar tool={tool} setTool={setTool} onUndo={handleUndo} onRedo={handleRedo} />
            {file ? (
                <div className="relative items-center justify-center" ref={pdfRef}>
                    <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderAnnotationLayer={false}
                            renderTextLayer={false} />
                    </Document>
                    <Stage
                        width={pdfRef.current?.clientWidth || 0}
                        height={pdfRef.current?.clientHeight || 0}
                        onMouseDown={handleMouseDown}
                        onMousemove={handleMouseMove}
                        onMouseup={handleMouseUp}
                        className='absolute top-0 left-0'
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
                                    globalCompositeOperation={line.compositeOperation || 'source-over'}
                                />
                            ))}
                            {/* Render the in-progress line */}
                            {isDrawing && currentPoints.length > 0 && (
                                <Line
                                    points={currentPoints}
                                    stroke={tool === 'eraser' ? 'white' : currentColor}
                                    strokeWidth={tool === 'eraser' ? 20 : 2}
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
                                    onClick={() => setSelectedId(textNote.id)}
                                    onDblClick={(e) => {
                                        const stage = e.target.getStage();
                                        const absPos = e.target.getAbsolutePosition();
                                        const id = textNote.id;

                                        // Show a textarea for editing
                                        const textArea = document.createElement('textarea');
                                        if (textNote.text === 'New note') {
                                            textArea.value = '';
                                        } else {
                                            textArea.value = textNote.text;
                                        }
                                        document.body.appendChild(textArea);

                                        textArea.style.position = 'absolute';
                                        textArea.style.top = `${stage?.container().offsetTop! + absPos.y}px`;
                                        textArea.style.left = `${stage?.container().offsetLeft! + absPos.x}px`;
                                        textArea.style.fontSize = `${textNote.fontSize}px`;
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
                                        }
                                    }}
                                />
                            ))}

                        </Layer>
                    </Stage>

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
