import { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Assessment, Question } from '@/types/course';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

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

export default function GradingPdfViewer({ assessment, question, pageContainerRef }: GradingPdfViewerProps) {
    const [answers, setAnswers] = useState<UploadedAnswer[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pdfReady, setPdfReady] = useState(false);

    // const viewerRef = useRef<HTMLDivElement>(null);

    const currentAnswer = answers[currentIndex] || null;

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

        const loadPdf = async () => {
            if (!currentAnswer) return;

            try {
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/uploaded-files/${currentAnswer.id}/answer-sheet`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                if (!cancelled) {
                    setPdfUrl(url);
                }
            } catch (err) {
                console.error('Failed to fetch student PDF', err);
                if (!cancelled) setPdfUrl(null);
            }
        };

        loadPdf();
        return () => {
            cancelled = true;
        };
    }, [currentAnswer]);


    const goToNext = () => {
        setCurrentIndex((i) => Math.min(i + 1, answers.length - 1));
    };

    const goToPrevious = () => {
        setCurrentIndex((i) => Math.max(i - 1, 0));
    };

    if (!question) {
        return <p className="text-muted-foreground p-4">No question selected.</p>;
    }

    return (
        <div className="flex flex-col h-full w-full p-4">
            {pdfUrl ? (
                <>
                    <div
                        className="border rounded relative overflow-auto"
                        style={{ height: 'calc(100vh - 160px)' }}
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
                                <div className="flex justify-center py-4">
                                    <Page
                                        pageNumber={question.page_number}
                                        width={containerWidth ? containerWidth - 32 : 500}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                    <div
                                        className="absolute border-2 border-blue-500 pointer-events-none"
                                        style={{
                                            top: question.y,
                                            left: question.x,
                                            width: question.width,
                                            height: question.height,
                                            zIndex: 10,
                                        }}
                                    />
                                </div>
                            )}
                        </Document>

                    </div>

                    {/* Navigation */}
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
