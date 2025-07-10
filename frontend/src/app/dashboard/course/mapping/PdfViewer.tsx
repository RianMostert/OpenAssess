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

export default function PdfViewer({ assessment, currentPage, setCurrentPage, creating, setCreatingQuestion, setEditingQuestion, editing }: PdfViewerProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }

        const handleResize = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    return (
        <div className="flex flex-col h-full w-full p-4">
            {pdfUrl ? (
                <>
                    {/* Scrollable PDF area */}
                    <div className="flex-1 overflow-auto border rounded relative" ref={containerRef}>
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages);
                                setCurrentPage(1);
                            }}
                        >
                            <div ref={pageRef} className="flex justify-center py-4">
                                <Page
                                    pageNumber={currentPage}
                                    width={containerWidth ? containerWidth - 32 : 500}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                                {creating && (
                                    <CreateQuestionModel
                                        assessmentId={assessment.id}
                                        currentPage={currentPage}
                                        pageContainerRef={containerRef}
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
                        </Document>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
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
