import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Assessment, Question } from '@/types/course';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PdfAnnotatorBar from '@dashboard/lecturer/course/components/PdfAnnotatorBar';
import AnnotationLayer, { AnnotationLayerProps } from '@dashboard/lecturer/course/components/AnnotationLayer';
import React from 'react';
import { 
    percentageToPixels, 
    getPageSizeFromComputedStyle,
    type PercentageCoordinates 
} from '@/lib/coordinateUtils';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

interface UploadedAnswer {
    id: string;
    student_id: string;
    student_name?: string;
    answer_sheet_file_path: string;
}

interface GradingPdfViewerProps {
    assessment: Assessment;
    question: Question | null;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
}

type Tool = 'pencil' | 'eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

export default function GradingPdfViewer({ assessment, question, pageContainerRef }: GradingPdfViewerProps) {
    const [answers, setAnswers] = useState<UploadedAnswer[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pdfReady, setPdfReady] = useState(false);
    const [selectedMark, setSelectedMark] = useState<number | null>(null);
    const [gradingError, setGradingError] = useState<string | null>(null);
    const [annotationsByPage, setAnnotationsByPage] = useState<Record<string, AnnotationLayerProps['annotations']>>({});
    const [tool, setTool] = useState<Tool | null>(null);
    const [renderedPage, setRenderedPage] = useState<number | null>(null);
    const [questionResultIdMap, setQuestionResultIdMap] = useState<Record<string, string>>({});
    const [isResizing, setIsResizing] = useState(false); // Track if currently resizing
    const [pdfVersion, setPdfVersion] = useState(0); // Force re-render

    const currentAnswer = answers[currentIndex] || null;
    const highlightRef = useRef<HTMLDivElement>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        
        // Use ResizeObserver to detect container size changes (like sidebar collapse)
        let resizeObserver: ResizeObserver | null = null;
        
        if (pageContainerRef.current) {
            resizeObserver = new ResizeObserver(() => {
                console.log('ResizeObserver triggered in GradingPdfViewer');
                
                // Set resizing state to potentially hide elements during resize
                setIsResizing(true);
                
                // Clear any existing timeout
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }
                
                // Update width immediately for PDF scaling
                updateWidth();
                
                // Debounce the re-rendering
                resizeTimeoutRef.current = setTimeout(() => {
                    setIsResizing(false);
                    setPdfVersion(prev => prev + 1);
                }, 300); // Wait 300ms after resize stops
            });
            resizeObserver.observe(pageContainerRef.current);
        }

        // Also listen for window resize as fallback
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

    useEffect(() => {
        const fetchAnswers = async () => {
            try {
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/answer-sheets`);
                const data = await res.json();
                setAnswers(data);
            } catch (err) {
                console.error('Failed to fetch student answers', err);
            }
        };

        fetchAnswers();
    }, [assessment.id]);

    useEffect(() => {
        let cancelled = false;

        setSelectedMark(null);
        setPdfUrl(null);
        setPdfReady(false);
        setRenderedPage(null);
        setAnnotationsByPage({});

        const loadPdfAndAnnotations = async () => {
            if (!currentAnswer || !question) return;

            try {
                // Load the student's PDF
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/uploaded-files/${currentAnswer.id}/answer-sheet`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                if (!cancelled) setPdfUrl(url);

                // Load the student's question result
                const resultRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/question-results?assessment_id=${assessment.id}&question_id=${question.id}&student_id=${currentAnswer.student_id}`
                );

                if (resultRes.ok) {
                    const resultData = await resultRes.json();
                    const resultId = resultData.id;

                    // Cache resultId by student
                    setQuestionResultIdMap((prev) => ({
                        ...prev,
                        [currentAnswer.student_id]: resultId,
                    }));

                    // Fetch annotations
                    const annotationRes = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/question-results/${resultId}/annotation?ts=${Date.now()}`
                    );

                    if (annotationRes.ok) {
                        const annotationsJson = await annotationRes.json();
                        console.log('Annotations loaded:', annotationsJson);

                        if (!cancelled) {
                            setAnnotationsByPage({
                                [question.page_number]: annotationsJson,
                            });
                            setSelectedMark(resultData.mark ?? null);
                        }
                    } else {
                        if (!cancelled) {
                            setAnnotationsByPage({
                                [question.page_number]: { page: question.page_number, lines: [], texts: [], stickyNotes: [] },
                            });
                            setSelectedMark(resultData.mark ?? null);
                        }
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
            // Clean up PDF URL when switching students
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [currentAnswer?.id, question?.id, assessment.id]);


    const saveAnnotations = async () => {
        if (!currentAnswer || !question) return;

        const annotations = annotationsByPage[question.page_number] ?? { lines: [], texts: [], stickyNotes: [] };

        const blob = new Blob([JSON.stringify(annotations)], { type: 'application/json' });
        const formData = new FormData();
        formData.append('assessment_id', assessment.id);
        formData.append('question_id', question.id);
        formData.append('student_id', currentAnswer.student_id);
        formData.append('mark', (selectedMark ?? 0).toString());
        formData.append('file', blob, 'annotations.json');

        try {
            await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/question-results/upload-annotation`, {
                method: 'POST',
                body: formData,
            });
            console.log('Annotations saved automatically');
        } catch (err) {
            console.error('Failed to save annotations', err);
        }
    };

    // Auto-save annotations whenever they change
    useEffect(() => {
        if (currentAnswer && question && annotationsByPage[question.page_number]) {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            
            // Debounce the save to avoid excessive API calls
            saveTimeoutRef.current = setTimeout(() => {
                saveAnnotations();
            }, 1000); // Save 1 second after annotations stop changing

            return () => {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
            };
        }
    }, [annotationsByPage, currentAnswer?.id, question?.id]);

    // Cleanup effect to save any pending changes on unmount or student change
    useEffect(() => {
        return () => {
            // Clear any pending save timeout and save immediately
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            // Save any pending annotations when component unmounts or student changes
            if (currentAnswer && question && annotationsByPage[question.page_number]) {
                // Call save immediately without timeout
                const annotations = annotationsByPage[question.page_number] ?? { lines: [], texts: [], stickyNotes: [] };
                const blob = new Blob([JSON.stringify(annotations)], { type: 'application/json' });
                const formData = new FormData();
                formData.append('assessment_id', assessment.id);
                formData.append('question_id', question.id);
                formData.append('student_id', currentAnswer.student_id);
                formData.append('mark', (selectedMark ?? 0).toString());
                formData.append('file', blob, 'annotations.json');

                // Note: This will be a fire-and-forget save since we can't await in cleanup
                fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/question-results/upload-annotation`, {
                    method: 'POST',
                    body: formData,
                }).catch(err => console.error('Failed to save annotations on cleanup', err));
            }
        };
    }, [currentAnswer?.id, question?.id, annotationsByPage, selectedMark, assessment.id]);

    const goToNext = async () => {
        setCurrentIndex((i) => Math.min(i + 1, answers.length - 1));
    };

    const goToPrevious = async () => {
        setCurrentIndex((i) => Math.max(i - 1, 0));
    };

    const handleGrade = async (mark: number) => {
        setSelectedMark(mark);
        // Save mark immediately when selected
        await saveMarkOnly(mark);
    };

    const saveMarkOnly = async (mark: number) => {
        if (!currentAnswer || !question) return;

        const formData = new FormData();
        formData.append('assessment_id', assessment.id);
        formData.append('question_id', question.id);
        formData.append('student_id', currentAnswer.student_id);
        formData.append('mark', mark.toString());

        try {
            await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/question-results/update-mark`, {
                method: 'POST',
                body: formData,
            });
            console.log('Mark saved automatically:', mark);
        } catch (err) {
            console.error('Failed to save mark', err);
        }
    };


    const scrollToHighlight = () => {
        const container = pageContainerRef.current;
        const highlight = highlightRef.current;

        if (container && highlight) {
            const containerRect = container.getBoundingClientRect();
            const highlightRect = highlight.getBoundingClientRect();

            const scrollTopOffset = highlightRect.top - containerRect.top - container.clientHeight / 2 + highlight.clientHeight / 2;

            container.scrollBy({
                top: scrollTopOffset,
                behavior: 'smooth',
            });
        }
    };

    // Scroll to highlight whenever the question, student, or PDF version changes
    useEffect(() => {
        if (pdfReady && renderedPage === question?.page_number && highlightRef.current) {
            // Add a small delay to ensure the highlight element is properly positioned
            const timeoutId = setTimeout(() => {
                scrollToHighlight();
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [pdfReady, renderedPage, question?.id, currentAnswer?.id, pdfVersion]);

    // Additional scroll trigger after DOM layout is complete
    useLayoutEffect(() => {
        if (pdfReady && renderedPage === question?.page_number && highlightRef.current && !isResizing) {
            // Use requestAnimationFrame to ensure the layout is complete
            const rafId = requestAnimationFrame(() => {
                scrollToHighlight();
            });
            
            return () => cancelAnimationFrame(rafId);
        }
    }, [pdfReady, renderedPage, question?.id, currentAnswer?.id, isResizing]);

    if (!question) {
        return <p className="text-muted-foreground p-4">No question selected.</p>;
    }

    return (
        <div className="flex flex-col h-full w-full p-4">
            <PdfAnnotatorBar
                tool={tool}
                setTool={setTool}
                onUndo={() => { }}
                onRedo={() => { }}
            />

            {pdfUrl ? (
                <>
                    <div
                        className="border rounded relative overflow-auto"
                        style={{ height: 'calc(100vh - 220px)' }}
                        ref={pageContainerRef}
                    >
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages);
                                setPdfReady(true);
                            }}
                            onLoadError={(err) => {
                                console.error("PDF load error:", err);
                                setPdfReady(false);
                            }}
                        >
                            {pdfReady && (
                                <div className="relative" id={`page-${question.page_number}`}>
                                    <Page
                                        key={`page-${question.page_number}-${containerWidth}-${pdfVersion}`} // Force re-render on width/version change
                                        pageNumber={question.page_number}
                                        width={containerWidth ? Math.max(containerWidth - 32, 400) : 500}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onRenderSuccess={() => {
                                            setRenderedPage(question.page_number);
                                            scrollToHighlight();
                                        }}
                                    />
                                    {renderedPage === question.page_number && !isResizing && (
                                        <AnnotationLayer
                                            key={`${currentAnswer.id}-${question.id}-${question.page_number}-${pdfVersion}`}
                                            page={question.page_number}
                                            annotations={annotationsByPage[question.page_number] ?? { lines: [], texts: [], stickyNotes: [] }}
                                            setAnnotations={(data) =>
                                                setAnnotationsByPage((prev) => ({
                                                    ...prev,
                                                    [question.page_number]: data,
                                                }))
                                            }
                                            tool={tool}
                                            containerRef={pageContainerRef}
                                            rendered={renderedPage === question.page_number}
                                        />
                                    )}
                                    {!isResizing && (() => {
                                        // Convert percentage coordinates to pixels for display
                                        // Use the actual PDF page element for consistency with mapping
                                        const pdfPageElement = document.querySelector(`#page-${question.page_number} .react-pdf__Page`);
                                        if (!pdfPageElement) {
                                            console.warn(`Could not find PDF page element for page ${question.page_number}`);
                                            return null;
                                        }

                                        const pageRect = pdfPageElement.getBoundingClientRect();
                                        const pageSize = {
                                            width: pageRect.width,
                                            height: pageRect.height
                                        };

                                        const percentageCoords: PercentageCoordinates = {
                                            x: question.x,
                                            y: question.y,
                                            width: question.width,
                                            height: question.height,
                                        };

                                        const pixelCoords = percentageToPixels(percentageCoords, pageSize);

                                        return (
                                            <>
                                                <div
                                                    ref={highlightRef}
                                                    key={`highlight-${question.id}-${pdfVersion}`}
                                                    className="absolute border-2 border-blue-500 pointer-events-none"
                                                    style={{
                                                        top: pixelCoords.y,
                                                        left: pixelCoords.x,
                                                        width: pixelCoords.width,
                                                        height: pixelCoords.height,
                                                        zIndex: 10,
                                                    }}
                                                />
                                                {question.max_marks !== undefined && (
                                                    <div
                                                        key={`marks-${question.id}-${pdfVersion}`}
                                                        className="absolute right-0 flex flex-col pr-2"
                                                        style={{
                                                            top: pixelCoords.y + pixelCoords.height / 2,
                                                            transform: 'translateY(-50%)',
                                                            zIndex: 15,
                                                        }}
                                                    >
                                                        {Array.from({
                                                            length: Math.floor((question.max_marks ?? 0) / (question.increment || 1)) + 1,
                                                        }).map((_, idx) => {
                                                            const value = idx * (question.increment || 1);
                                                            return (
                                                                <button
                                                                    key={value}
                                                                    onClick={() => handleGrade(value)}
                                                                    className={`text-sm rounded px-2 py-1 mb-1 border ${selectedMark === value
                                                                        ? 'bg-green-200 border-green-500 font-semibold'
                                                                        : 'bg-white border-gray-300 hover:bg-blue-100'
                                                                        }`}
                                                                >
                                                                    {value}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </Document>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4">
                        <Button onClick={goToPrevious} disabled={currentIndex <= 0}>
                            Previous Student
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Student {currentIndex + 1} of {answers.length}
                        </p>
                        <Button onClick={goToNext} disabled={currentIndex >= answers.length - 1}>
                            Next Student
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">Loading answer sheet PDF...</p>
            )}
        </div>
    );
}
