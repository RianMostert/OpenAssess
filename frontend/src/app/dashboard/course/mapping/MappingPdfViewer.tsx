import { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import CreateQuestionController from '@dashboard/course/mapping/CreateQuestionController';
import EditQuestionController from '@dashboard/course/mapping/EditQuestionController';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Assessment, Question } from '@/types/course';

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
    editing: Question | null;
    setEditingQuestion: (question: Question | null) => void;
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
    const [questions, setQuestions] = useState<Question[]>([]);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const fetchQuestions = async () => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/questions`
            );
            if (!res.ok) throw new Error('Failed to fetch questions');
            const data = await res.json();
            setQuestions(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [assessment]);

    // Dynamically set width based on container
    useEffect(() => {
        const updateWidth = () => {
            if (pageContainerRef.current) {
                setContainerWidth(pageContainerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [pageContainerRef]);

    useEffect(() => {
        const fetchPdf = async () => {
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/question-paper`
                );
                if (!res.ok) throw new Error('PDF not found');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } catch (err) {
                console.error('Failed to fetch PDF:', err);
                setPdfUrl(null);
                setPdfError('Failed to load PDF.');
            }
        };

        fetchPdf();
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
        <div className="flex flex-col h-full w-full p-4">
            {pdfUrl ? (
                <>
                    <div
                        ref={pageContainerRef}
                        className="border rounded relative overflow-auto w-full"
                        style={{ height: 'calc(100vh - 160px)' }}
                    >
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={({ numPages }) => {
                                console.log("PDF loaded. Pages:", numPages);
                                setNumPages(numPages);
                                setCurrentPage(1);
                            }}
                            onLoadError={(err) => {
                                console.error("PDF load error:", err);
                                setPdfError("PDF failed to render.");
                            }}
                        >
                            <div className="flex justify-center py-4" id={`page-${currentPage}`}>
                                <div className="relative">
                                    <Page
                                        pageNumber={currentPage}
                                        width={containerWidth ? containerWidth - 32 : 500}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                    {questions
                                        .filter((q) => q.page_number === currentPage)
                                        .map((q) => (
                                            <div
                                                key={q.id}
                                                className="absolute border-2 border-blue-500 cursor-pointer"
                                                style={{
                                                    left: `${q.x}px`,
                                                    top: `${q.y - 17}px`,
                                                    width: `${q.width}px`,
                                                    height: `${q.height}px`,
                                                }}
                                                onClick={() => setEditingQuestion(q)}
                                                title={`${q.question_number}`}
                                            />
                                        ))}
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

                    <div className="flex items-center justify-center gap-4 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage <= 1}
                        >
                            Previous
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Page {currentPage} of {numPages}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setCurrentPage((prev) => Math.min(prev + 1, numPages || prev))
                            }
                            disabled={currentPage >= (numPages || 0)}
                        >
                            Next
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-sm text-red-500">{pdfError || 'No question paper available.'}</p>
            )}
        </div>
    );
}
