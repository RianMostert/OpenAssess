'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Line } from 'react-konva';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { 
    percentageToPixels, 
    type PercentageCoordinates,
    linePointsToPixels,
    positionToPixels,
    dimensionsToPixels,
    getScaledFontSize,
    getPageSizeFromComputedStyle
} from '@/lib/coordinateUtils';
import StickyNote from './StickyNote';
import TextNote from './TextNote';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

interface Assessment {
    id: string;
    title: string;
}

interface Question_for_query {
    id: string;
    question_number: number;
    page_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface UploadedAnswer {
    id: string;
    student_id: string;
    student_name: string;
}

interface LineElement {
    id: string;
    tool: 'pencil' | 'eraser';
    points: number[]; // Stored as percentage coordinates
    stroke: string;
    strokeWidth: number;
    compositeOperation?: string;
}

interface TextElement {
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

interface StickyNoteElement {
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

interface AnnotationLayerProps {
    page: number;
    lines: LineElement[];
    texts: TextElement[];
    stickyNotes: StickyNoteElement[];
}

interface QueryReviewPdfViewerProps {
    assessment: Assessment;
    studentId: string;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    questionsToHighlight?: Question_for_query[]; // Questions that are part of the query
}

export default function QueryReviewPdfViewer({ 
    assessment, 
    studentId,
    pageContainerRef,
    questionsToHighlight = []
}: QueryReviewPdfViewerProps) {
    const [answer, setAnswer] = useState<UploadedAnswer | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pdfReady, setPdfReady] = useState(false);
    const [annotationsByPage, setAnnotationsByPage] = useState<Record<string, AnnotationLayerProps>>({});
    const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
    const [isResizing, setIsResizing] = useState(false);
    const [pdfVersion, setPdfVersion] = useState(0); // Force re-render

    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper function to clean up PDF URL
    const cleanupPdfUrl = (url: string | null) => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };

    // Dynamically set width based on container using ResizeObserver with debouncing
    useEffect(() => {
        const updateWidth = () => {
            if (pageContainerRef.current) {
                const newWidth = pageContainerRef.current.offsetWidth;
                console.log('Container width updated:', newWidth);
                setContainerWidth(newWidth);
            }
        };

        updateWidth();
        
        // Use ResizeObserver to detect container size changes
        let resizeObserver: ResizeObserver | null = null;
        
        if (pageContainerRef.current) {
            resizeObserver = new ResizeObserver(() => {
                console.log('ResizeObserver triggered in QueryReviewPdfViewer');
                
                setIsResizing(true);
                
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }
                
                updateWidth();
                
                resizeTimeoutRef.current = setTimeout(() => {
                    setIsResizing(false);
                    setPdfVersion(prev => prev + 1);
                }, 300);
            });
            resizeObserver.observe(pageContainerRef.current);
        }

        window.addEventListener('resize', updateWidth);
        
        return () => {
            window.removeEventListener('resize', updateWidth);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
        };
    }, [pageContainerRef]);

    // Load student's PDF and annotations
    useEffect(() => {
        let cancelled = false;

        const loadPdfAndAnnotations = async () => {
            if (!studentId || !assessment) return;

            try {
                // First get the student's answer sheet
                const answersRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/answer-sheets`);
                const answers = await answersRes.json();
                const studentAnswer = answers.find((answer: UploadedAnswer) => answer.student_id === studentId);
                
                if (!studentAnswer) {
                    console.error('No answer sheet found for student');
                    return;
                }

                if (!cancelled) setAnswer(studentAnswer);

                // Load the student's PDF
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/uploaded-files/${studentAnswer.id}/answer-sheet`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                if (!cancelled) setPdfUrl(url);

                // Load all annotations for the assessment
                const resultsRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/question-results/student/${studentId}/assessment/${assessment.id}/all-results`
                );

                if (resultsRes.ok) {
                    const studentData = await resultsRes.json();
                    
                    if (!cancelled) {
                        // Load all annotations for all questions
                        const allAnnotations: Record<string, AnnotationLayerProps> = {};
                        
                        for (const questionData of studentData.questions) {
                            if (questionData.annotation) {
                                const annotationKey = `${studentId}-${questionData.page_number}`;
                                allAnnotations[annotationKey] = {
                                    page: questionData.page_number,
                                    lines: questionData.annotation.lines || [],
                                    texts: questionData.annotation.texts || [],
                                    stickyNotes: questionData.annotation.stickyNotes || []
                                };
                            }
                        }
                        
                        setAnnotationsByPage(allAnnotations);
                    }
                }
            } catch (err) {
                console.error('Error loading PDF or annotations', err);
                if (!cancelled) setPdfUrl(null);
            }
        };

        loadPdfAndAnnotations();
        
        return () => {
            cancelled = true;
            cleanupPdfUrl(pdfUrl);
        };
    }, [studentId, assessment.id]);

    const renderPageWithAnnotations = (pageNumber: number) => {
        const annotationKey = `${studentId}-${pageNumber}`;
        const annotations = annotationsByPage[annotationKey];
        const pageWidth = containerWidth ? containerWidth - 80 : 800; // Account for padding and margins

        // Helper function to get page size for coordinate calculations
        const getPageSize = () => {
            const pageSize = getPageSizeFromComputedStyle(pageNumber);
            if (pageSize) {
                return pageSize;
            }
            // Fallback: get from DOM element
            const pdfPageElement = document.querySelector(`#page-${pageNumber} .react-pdf__Page`);
            if (pdfPageElement) {
                const rect = pdfPageElement.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            }
            return { width: pageWidth, height: pageWidth * 1.4 }; // Fallback A4 ratio
        };

        return (
            <div key={`${pageNumber}-${pdfVersion}`} className="relative mb-6 border-2 border-brand-accent-300 rounded-lg shadow-sm bg-white" id={`page-${pageNumber}`}>
                {/* Page number indicator */}
                <div className="absolute top-2 right-2 bg-brand-primary-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md z-[100]">
                    Page {pageNumber}
                </div>
                
                <Page
                    pageNumber={pageNumber}
                    width={pageWidth}
                    onRenderSuccess={() => {
                        console.log(`Page ${pageNumber} rendered successfully`);
                        setRenderedPages(prev => new Set([...prev, pageNumber]));
                    }}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                />
                
                {/* Question highlights - only show after page is rendered */}
                {renderedPages.has(pageNumber) && questionsToHighlight
                    .filter(q => q.page_number === pageNumber)
                    .map((question) => {
                        // Wait for the page to be rendered before calculating positioning
                        const pdfPageElement = document.querySelector(`#page-${pageNumber} .react-pdf__Page`);
                        if (!pdfPageElement) return null;

                        const pageRect = pdfPageElement.getBoundingClientRect();
                        const pageSize = { width: pageRect.width, height: pageRect.height };
                        
                        // Use the same coordinate system as the grading viewer
                        const percentageCoords: PercentageCoordinates = {
                            x: question.x,
                            y: question.y, 
                            width: question.width,
                            height: question.height,
                        };
                        const pixelCoords = percentageToPixels(percentageCoords, pageSize);
                        
                                        return (
                                            <div
                                                key={question.id}
                                                className="absolute border-2 border-blue-500 rounded pointer-events-none"
                                                style={{
                                                    left: `${pixelCoords.x}px`,
                                                    top: `${pixelCoords.y}px`,
                                                    width: `${pixelCoords.width}px`,
                                                    height: `${pixelCoords.height}px`,
                                                    zIndex: 10,
                                                }}
                                            >
                                                <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded font-semibold">
                                                    {question.question_number}
                                                </div>
                                            </div>
                                        );
                                    })}                {/* Existing annotations overlay */}
                {renderedPages.has(pageNumber) && annotations && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Konva Stage for line rendering */}
                        {annotations.lines && annotations.lines.length > 0 && (() => {
                            const pageSize = getPageSize();
                            return (
                                <Stage
                                    width={pageSize.width}
                                    height={pageSize.height}
                                    className="absolute top-0 left-0 z-30"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <Layer>
                                        {annotations.lines.map((line: LineElement, index: number) => {
                                            // Convert percentage points to pixel points for display
                                            const pixelPoints = linePointsToPixels(line.points, pageSize);
                                            
                                            return (
                                                <Line
                                                    key={line.id || `line-${index}`}
                                                    points={pixelPoints}
                                                    stroke={line.stroke || '#ff0000'}
                                                    strokeWidth={line.strokeWidth || 2}
                                                    tension={0.5}
                                                    lineCap="round"
                                                    globalCompositeOperation={(line.compositeOperation || 'source-over') as GlobalCompositeOperation}
                                                />
                                            );
                                        })}
                                    </Layer>
                                </Stage>
                            );
                        })()}

                        {/* Text Notes */}
                        {annotations.texts?.map((textNote: TextElement, index: number) => {
                            // Convert percentage position to pixel position for display
                            const pageSize = getPageSize();
                            const pixelPos = positionToPixels({ x: textNote.x, y: textNote.y }, pageSize);
                            const pixelDimensions = dimensionsToPixels({ 
                                width: textNote.width || 200, 
                                height: textNote.height || 50 
                            }, pageSize);
                            
                            return (
                                <div
                                    key={textNote.id || `text-${index}`}
                                    style={{
                                        position: 'absolute',
                                        top: pixelPos.y,
                                        left: pixelPos.x,
                                        zIndex: 40,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <TextNote
                                        content={textNote.text}
                                        width={pixelDimensions.width}
                                        height={pixelDimensions.height}
                                        onChange={() => {}} 
                                        onClick={() => {}}
                                        isSelected={false}
                                        textColor="#ef4444"
                                    />
                                </div>
                            );
                        })}

                        {/* Sticky Notes */}
                        {annotations.stickyNotes?.map((note: StickyNoteElement, index: number) => {
                            // Convert percentage position to pixel position for display
                            const pageSize = getPageSize();
                            const pixelPos = positionToPixels({ x: note.x, y: note.y }, pageSize);
                            const scaleFactor = Math.min(pageSize.width / 595, pageSize.height / 842); // Scale based on A4 reference
                            const scaledFontSize = getScaledFontSize(note.fontSize, pageSize);
                            
                            return (
                                <div
                                    key={note.id || `note-${index}`}
                                    style={{
                                        position: 'absolute',
                                        top: pixelPos.y,
                                        left: pixelPos.x,
                                        zIndex: 50,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <StickyNote
                                        content={note.text}
                                        scaleFactor={scaleFactor}
                                        fontSize={scaledFontSize}
                                        onChange={() => {}}
                                        onClick={() => {}}
                                        isSelected={false}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (!answer) {
        return <p className="text-muted-foreground p-4">Loading student answer sheet...</p>;
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {pdfUrl ? (
                <div
                    className="border-2 border-brand-accent-400 rounded-lg relative overflow-auto pdf-container h-full w-full bg-white"
                    style={{ 
                        touchAction: 'pan-x pan-y',
                    }}
                >
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={({ numPages }) => {
                            console.log('PDF loaded with numPages:', numPages);
                            setNumPages(numPages);
                            setPdfReady(true);
                        }}
                        onLoadError={(err) => {
                            console.error("PDF load error:", err);
                            setPdfReady(false);
                        }}
                    >
                        {pdfReady && numPages && (
                            <div className="p-4 w-fit">
                                {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNumber => (
                                    renderPageWithAnnotations(pageNumber)
                                ))}
                            </div>
                        )}
                    </Document>
                </div>
            ) : (
                <p className="text-sm text-brand-primary-600 p-4 font-medium">
                    Loading PDF...
                </p>
            )}
        </div>
    );
}