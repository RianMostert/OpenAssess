import { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import CreateQuestionModel from '@dashboard/course/mapping/CreateQuestionModel';
import EditQuestionModel from '@dashboard/course/mapping/EditQuestionModel';
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

export default function PdfViewer({
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
    const observerRef = useRef<IntersectionObserver | null>(null);

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

    // Load PDF
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

    // Scroll-to-page helper
    const scrollToPage = (page: number) => {
        const el = document.getElementById(`page-${page}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex flex-col h-full w-full p-4">
            {pdfUrl ? (
                <>
                    <div
                        ref={pageContainerRef}
                        className="border rounded relative overflow-auto"
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
                                <Page
                                    pageNumber={currentPage}
                                    width={containerWidth ? containerWidth - 32 : 500}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </div>
                        </Document>

                        {creating && (
                            <CreateQuestionModel
                                assessmentId={assessment.id}
                                currentPage={currentPage}
                                pageContainerRef={pageContainerRef}
                                onQuestionCreated={() => setCreatingQuestion(false)}
                            />
                        )}

                        {editing && (
                            <EditQuestionModel
                                question={editing}
                                open={!!editing}
                                setOpen={(open) => !open && setEditingQuestion(null)}
                                onUpdated={() => {
                                    setEditingQuestion(null);
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
