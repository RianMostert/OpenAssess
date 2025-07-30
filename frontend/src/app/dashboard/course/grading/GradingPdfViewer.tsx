import { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Assessment, Question } from '@/types/course';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PdfAnnotatorBar from '@dashboard/course/components/PdfAnnotatorBar';
import AnnotationLayer, { AnnotationLayerProps } from '@dashboard/course/components/AnnotationLayer';
import React from 'react';

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

    const currentAnswer = answers[currentIndex] || null;
    const highlightRef = useRef<HTMLDivElement>(null);

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
        };
    }, [currentAnswer?.id, question?.id, assessment.id]);


    const saveAnnotations = async () => {
        if (!currentAnswer || !question) return;

        const annotations = annotationsByPage[question.page_number];
        if (!annotations) return;

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
        } catch (err) {
            console.error('Failed to save annotations', err);
        }
    };

    const goToNext = async () => {
        await saveAnnotations();
        setCurrentIndex((i) => Math.min(i + 1, answers.length - 1));
    };

    const goToPrevious = async () => {
        await saveAnnotations();
        setCurrentIndex((i) => Math.max(i - 1, 0));
    };

    const handleGrade = async (mark: number) => {
        setSelectedMark(mark);
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
                                        pageNumber={question.page_number}
                                        width={containerWidth ? containerWidth - 32 : 500}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onRenderSuccess={() => {
                                            setRenderedPage(question.page_number);
                                            scrollToHighlight();
                                        }}
                                    />
                                    {renderedPage === question.page_number && (
                                        <AnnotationLayer
                                            key={`${currentAnswer.id}-${question.id}-${question.page_number}`}
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
                                    <div
                                        ref={highlightRef}
                                        className="absolute border-2 border-blue-500 pointer-events-none"
                                        style={{
                                            top: question.y - 9,
                                            left: question.x,
                                            width: question.width + 17,
                                            height: question.height,
                                            zIndex: 10,
                                        }}
                                    />
                                    {question.max_marks !== undefined && (
                                        <div
                                            className="absolute right-0 flex flex-col pr-2"
                                            style={{
                                                top: question.y + question.height / 2,
                                                transform: 'translateY(-50%)',
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
