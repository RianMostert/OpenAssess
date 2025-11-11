import { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import CreateQuestionController from '@dashboard/lecturer/course/mapping/CreateQuestionController';
import EditQuestionController from '@dashboard/lecturer/course/mapping/EditQuestionController';
import { questionService, type MappingQuestion } from '@/services';
import { Assessment } from '@/types/course';
import { 
    percentageToPixels, 
    getPageSizeFromComputedStyle,
    type PercentageCoordinates 
} from '@/lib/coordinateUtils';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

interface PdfViewerProps {
    assessment: Assessment;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    creating: boolean;
    setCreatingQuestion: (val: boolean) => void;
    editing: MappingQuestion | null;
    setEditingQuestion: (question: MappingQuestion | null) => void;
}

export default function MappingPdfViewer({
    assessment,
    currentPage,
    setCurrentPage,
    pageContainerRef,
    creating,
    setCreatingQuestion,
    editing,
    setEditingQuestion,
}: PdfViewerProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [questions, setQuestions] = useState<MappingQuestion[]>([]);
    const [questionsVersion, setQuestionsVersion] = useState(0); // Force re-render
    const [isResizing, setIsResizing] = useState(false); // Track if currently resizing
    const [pdfLoadError, setPdfLoadError] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const fetchQuestions = async () => {
        try {
            const data = await questionService.getAssessmentQuestions(assessment.id);
            setQuestions(data);
            setQuestionsVersion(prev => prev + 1); // Force re-render
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [assessment]);

    // Listen for question events to refresh the display
    useEffect(() => {
        const handleQuestionChange = () => {
            fetchQuestions();
        };

        const handlePdfUpdate = () => {
            // Clean up old PDF URL to prevent memory leaks
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
            // Refetch the PDF
            fetchPdf();
        };

        window.addEventListener('question-created', handleQuestionChange);
        window.addEventListener('question-updated', handleQuestionChange);
        window.addEventListener('question-deleted', handleQuestionChange);
        window.addEventListener('question-paper-updated', handlePdfUpdate);

        return () => {
            window.removeEventListener('question-created', handleQuestionChange);
            window.removeEventListener('question-updated', handleQuestionChange);
            window.removeEventListener('question-deleted', handleQuestionChange);
            window.removeEventListener('question-paper-updated', handlePdfUpdate);
        };
    }, [assessment, pdfUrl]);

    // Force re-render of question boxes when container width changes (but not during active resizing)
    useEffect(() => {
        if (containerWidth && questions.length > 0 && !isResizing) {
            console.log('Triggering question re-render due to width change:', containerWidth);
            setQuestionsVersion(prev => prev + 1);
        }
    }, [containerWidth, isResizing]);

    // Force re-render when page changes
    useEffect(() => {
        const timer = setTimeout(() => {
            setQuestionsVersion(prev => prev + 1);
        }, 100); // Give time for page to render
        
        return () => clearTimeout(timer);
    }, [currentPage]);

    // Additional effect to ensure PDF re-renders when questions change
    useEffect(() => {
        if (questions.length > 0) {
            const timer = setTimeout(() => {
                setQuestionsVersion(prev => prev + 1);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [questions.length]);

    // Dynamically set width based on container using ResizeObserver with debouncing
    useEffect(() => {
        const updateWidth = () => {
            if (pageContainerRef.current) {
                const newWidth = pageContainerRef.current.offsetWidth;
                const pdfWidth = Math.max(newWidth * 0.95, 400);
                console.log('Container width updated:', newWidth, 'PDF width will be:', pdfWidth);
                setContainerWidth(newWidth);
            }
        };

        updateWidth();
        
        // Use ResizeObserver to detect container size changes (like sidebar collapse)
        let resizeObserver: ResizeObserver | null = null;
        
        if (pageContainerRef.current) {
            resizeObserver = new ResizeObserver(() => {
                console.log('ResizeObserver triggered');
                
                // Set resizing state to hide questions during resize
                setIsResizing(true);
                
                // Clear any existing timeout
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }
                
                // Update width immediately for PDF scaling
                updateWidth();
                
                // Debounce the question re-rendering
                resizeTimeoutRef.current = setTimeout(() => {
                    setIsResizing(false);
                    setQuestionsVersion(prev => prev + 1);
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

    // Define fetchPdf function outside useEffect so it can be reused
    const fetchPdf = async () => {
        if (!isMountedRef.current) return;
        
        try {
            // Clean up old PDF URL to prevent memory leaks
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
            
            const url = await questionService.getQuestionPaper(assessment.id);
            
            if (!isMountedRef.current) {
                // Component unmounted during fetch, clean up
                URL.revokeObjectURL(url);
                return;
            }
            
            setPdfUrl(url);
            setPdfError(null); // Clear any previous errors
            setPdfLoadError(false);
        } catch (err) {
            console.error('Failed to fetch PDF:', err);
            if (isMountedRef.current) {
                setPdfUrl(null);
                setPdfError('Failed to load PDF.');
                setPdfLoadError(true);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchPdf();
        
        // Add global error handler for PDF.js worker errors
        const handleGlobalError = (event: ErrorEvent) => {
            const errorMessage = event.message || '';
            // Catch the specific PDF.js worker error
            if (errorMessage.includes('messageHandler') || 
                errorMessage.includes('sendWithPromise') ||
                errorMessage.includes('PDF.js')) {
                console.warn('PDF.js worker error caught:', errorMessage);
                event.preventDefault(); // Prevent default error handling
                
                if (isMountedRef.current) {
                    setPdfLoadError(true);
                    setPdfError('PDF viewer disconnected. Please retry.');
                }
            }
        };
        
        window.addEventListener('error', handleGlobalError);
        
        // Cleanup function to revoke the PDF URL when component unmounts
        return () => {
            isMountedRef.current = false;
            window.removeEventListener('error', handleGlobalError);
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [assessment]);

    // Track visible page
    useEffect(() => {
        if (!pageContainerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((entry) => entry.isIntersecting);
                if (visible) {
                    const match = visible.target.id.match(/page-(\d+)/);
                    if (match) {
                        setCurrentPage(Number(match[1]));
                    }
                }
            },
            {
                root: pageContainerRef.current,
                threshold: 0.6,
            }
        );

        observerRef.current = observer;
        return () => observer.disconnect();
    }, [pageContainerRef, setCurrentPage]);

    return (
        <div className="flex flex-col h-full w-full p-4 font-raleway">
            {pdfUrl ? (
                <>
                    <div
                        ref={pageContainerRef}
                        className="border-2 border-brand-accent-400 rounded-lg relative overflow-auto w-full pdf-container shadow-md"
                        style={{ 
                            height: 'calc(100vh - 160px)',
                            touchAction: 'pan-x pan-y', // Allow panning but prevent zoom for better drawing experience
                        }}
                    >
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={({ numPages }) => {
                                console.log("PDF loaded. Pages:", numPages);
                                setNumPages(numPages);
                                setCurrentPage(1);
                                setPdfLoadError(false);
                            }}
                            onLoadError={(err) => {
                                console.error("PDF load error:", err);
                                setPdfError("PDF failed to render. The PDF worker may have disconnected.");
                                setPdfLoadError(true);
                            }}
                            error={
                                <div className="flex flex-col items-center justify-center p-8 gap-4">
                                    <p className="text-red-600 font-semibold">Failed to load PDF</p>
                                    <p className="text-sm text-gray-600">The PDF viewer encountered an error.</p>
                                    <Button 
                                        onClick={() => {
                                            setPdfLoadError(false);
                                            fetchPdf();
                                        }}
                                        className="bg-brand-primary-600 text-white hover:bg-brand-primary-700"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            }
                            loading={
                                <div className="flex items-center justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary-600"></div>
                                    <span className="ml-2">Loading PDF...</span>
                                </div>
                            }
                        >
                            <div className="flex justify-center py-4" id={`page-${currentPage}`}>
                                <div className="relative">
                                    <Page
                                        key={`page-${currentPage}-${containerWidth}`} // Force re-render on width change
                                        pageNumber={currentPage}
                                        width={containerWidth ? Math.max(containerWidth * 0.95, 400) : 500}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onRenderSuccess={() => {
                                            // Trigger question re-render after page renders
                                            setTimeout(() => {
                                                setQuestionsVersion(prev => prev + 1);
                                            }, 100);
                                        }}
                                    />
                                    {!isResizing && questions
                                        .filter((q) => q.page_number === currentPage)
                                        .map((q) => {
                                            // Convert percentage coordinates to pixels for display
                                            const pageElement = document.querySelector(`#page-${currentPage} .react-pdf__Page`);
                                            
                                            if (!pageElement) {
                                                console.warn(`Could not find page element for page ${currentPage}`);
                                                return null;
                                            }

                                            const pageRect = pageElement.getBoundingClientRect();
                                            const pageSize = {
                                                width: pageRect.width,
                                                height: pageRect.height
                                            };

                                            const percentageCoords: PercentageCoordinates = {
                                                x: q.x,
                                                y: q.y,
                                                width: q.width,
                                                height: q.height,
                                            };

                                            const pixelCoords = percentageToPixels(percentageCoords, pageSize);

                                            return (
                                                <div
                                                    key={`${q.id}-${questionsVersion}`}
                                                    className="absolute border-2 border-blue-500 cursor-pointer hover:border-blue-700 hover:bg-blue-100 hover:bg-opacity-20 transition-colors"
                                                    style={{
                                                        left: `${pixelCoords.x}px`,
                                                        top: `${pixelCoords.y}px`,
                                                        width: `${pixelCoords.width}px`,
                                                        height: `${pixelCoords.height}px`,
                                                    }}
                                                    onClick={() => setEditingQuestion(q)}
                                                    title={`${q.question_number} - Click to edit`}
                                                >
                                                    {/* <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                                                        {q.question_number}
                                                    </div> */}
                                                </div>
                                            );
                                        })
                                        .filter(Boolean)}
                                </div>
                            </div>
                        </Document>

                        {creating && (
                            <CreateQuestionController
                                assessmentId={assessment.id}
                                currentPage={currentPage}
                                pageContainerRef={pageContainerRef}
                                onQuestionCreated={() => {
                                    setCreatingQuestion(false);
                                    fetchQuestions();
                                }}
                            />
                        )}

                        {editing && (
                            <EditQuestionController
                                question={editing}
                                pageContainerRef={pageContainerRef}
                                onClose={() => setEditingQuestion(null)}
                                onUpdated={() => {
                                    setEditingQuestion(null);
                                    fetchQuestions();
                                }}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4 font-raleway">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage <= 1}
                            className="touch-manipulation min-h-[44px] border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </Button>
                        <p className="text-sm font-semibold text-brand-primary-700 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 px-4 py-2 rounded-lg border-2 border-brand-accent-200">
                            Page {currentPage} of {numPages}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setCurrentPage((prev) => Math.min(prev + 1, numPages || prev))
                            }
                            disabled={currentPage >= (numPages || 0)}
                            className="touch-manipulation min-h-[44px] border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </Button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <p className="text-sm text-red-500">{pdfError || 'No question paper available.'}</p>
                    {pdfLoadError && (
                        <Button 
                            onClick={() => {
                                setPdfLoadError(false);
                                setPdfError(null);
                                fetchPdf();
                            }}
                            className="bg-brand-primary-600 text-white hover:bg-brand-primary-700"
                        >
                            Retry Loading PDF
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
