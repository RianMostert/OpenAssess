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
    points: number[];
    stroke: string;
    strokeWidth: number;
    id: string;
}

type Tool = 'highlighter' | 'pencil' | 'sticky-note' | 'eraser' | 'undo' | 'redo';

const PdfAnnotator: React.FC = () => {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [file, setFile] = React.useState<File | string | null>(null);
    const [numPages, setNumPages] = React.useState<number | null>(null);
    const [pageNumber, setPageNumber] = React.useState<number>(1);
    const [scale, setScale] = React.useState<number>(1.0);
    const [tool, setTool] = React.useState<Tool | null>(null);

    const [lines, setLines] = useState<LineElement[]>([]);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [currentPoints, setCurrentPoints] = useState<number[]>([]);
    const [currentColor, setCurrentColor] = useState<string>('#ff0000');

    // const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    //     width: 0,
    //     height: 0
    // });

    // Drawing logic
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (tool !== 'pencil') return;

        setIsDrawing(true);
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
            setCurrentPoints([pos.x, pos.y]);
        }
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;

        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (point) {
            setCurrentPoints([...currentPoints, point.x, point.y]);
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing || tool !== 'pencil') return;

        setIsDrawing(false);
        if (currentPoints.length >= 4) { // Ensure we have at least 2 points
            setLines([
                ...lines,
                {
                    points: currentPoints,
                    stroke: currentColor,
                    strokeWidth: 2,
                    id: `line_${Date.now()}`
                }
            ]);
        }
        setCurrentPoints([]);
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
            <ToolBar tool={tool} setTool={setTool} />
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
                        className='border border-red-500 absolute top-0 left-0'
                    >
                        <Layer>
                            {lines.map((line, index) => (
                                <Line
                                    key={index}
                                    points={line.points}
                                    stroke="black"
                                    strokeWidth={2}
                                    tension={0.5}
                                    lineCap="round"
                                    globalCompositeOperation="source-over"
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
