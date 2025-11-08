import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Assessment, Question, MarkingMode, QuestionWithResult, StudentAllResults, UploadedAnswer } from '@/types/course';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PdfAnnotatorBar from '@dashboard/lecturer/course/components/PdfAnnotatorBar';
import AnnotationLayer, { AnnotationLayerProps } from '@dashboard/lecturer/course/components/AnnotationLayer';
import QuestionOverlay from './QuestionOverlay';
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

interface MarkingPdfViewerProps {
    assessment: Assessment;
    question: Question | null;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    markingMode: MarkingMode;
    currentStudentIndex?: number;
    onStudentIndexChange?: (index: number) => void;
    studentAllResults?: StudentAllResults | null;
    onStudentAllResultsChange?: (results: StudentAllResults | null) => void;
    onRefreshStudentData?: () => void;
}

type Tool = 'pencil' | 'eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

export default function MarkingPdfViewer({ 
    assessment, 
    question, 
    pageContainerRef, 
    markingMode,
    currentStudentIndex: propCurrentIndex,
    onStudentIndexChange,
    studentAllResults: propStudentAllResults,
    onStudentAllResultsChange,
    onRefreshStudentData
}: MarkingPdfViewerProps) {
    const [answers, setAnswers] = useState<UploadedAnswer[]>([]);
    const [localCurrentIndex, setLocalCurrentIndex] = useState(0);
    
    // Always use shared state when available (both modes)
    const currentIndex = propCurrentIndex ?? localCurrentIndex;
    const updateCurrentIndex = (newIndex: number | ((prev: number) => number)) => {
        if (onStudentIndexChange) {
            // Use shared state management when available (both modes)
            const nextIndex = typeof newIndex === 'function' ? newIndex(currentIndex) : newIndex;
            onStudentIndexChange(nextIndex);
        } else {
            // Fallback to local state
            setLocalCurrentIndex(newIndex);
        }
    };
        
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pdfReady, setPdfReady] = useState(false);
    const [selectedMark, setSelectedMark] = useState<number | null>(null);
    const [annotationsByPage, setAnnotationsByPage] = useState<Record<string, AnnotationLayerProps['annotations']>>({});
    const [tool, setTool] = useState<Tool | null>(null);
    const [renderedPage, setRenderedPage] = useState<number | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [pdfVersion, setPdfVersion] = useState(0); // Force re-render

    // New state for student-by-student mode - use shared state when available
    const studentAllResults = markingMode === 'student-by-student' ? propStudentAllResults : null;
    const setStudentAllResults = onStudentAllResultsChange || (() => {});
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

    const currentAnswer = answers[currentIndex] || null;
    const highlightRef = useRef<HTMLDivElement>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper function to clean up PDF URL
    const cleanupPdfUrl = (url: string | null) => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };

    // Helper function to create a unique key for annotations per student per page
    const getAnnotationKey = (studentId: string, pageNumber: number) => {
        return `${studentId}-${pageNumber}`;
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

        // Only run for question-by-question mode
        if (markingMode !== 'question-by-question') return;

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

                    // Fetch annotations
                    const annotationRes = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/question-results/${resultData.id}/annotation?ts=${Date.now()}`
                    );

                    if (annotationRes.ok) {
                        const annotationsJson = await annotationRes.json();
                        console.log('Annotations loaded:', annotationsJson);

                        if (!cancelled) {
                            // Use student-specific key for annotations
                            const annotationKey = getAnnotationKey(currentAnswer.student_id, question.page_number);
                            setAnnotationsByPage(prev => ({
                                ...prev,
                                [annotationKey]: annotationsJson,
                            }));
                            setSelectedMark(resultData.mark ?? null);
                            console.log('Question-by-question mark loaded:', resultData.mark); // Debug log
                        }
                    } else {
                        if (!cancelled) {
                            // Use student-specific key for empty annotations
                            const annotationKey = getAnnotationKey(currentAnswer.student_id, question.page_number);
                            setAnnotationsByPage(prev => ({
                                ...prev,
                                [annotationKey]: { page: question.page_number, lines: [], texts: [], stickyNotes: [] },
                            }));
                            setSelectedMark(resultData.mark ?? null);
                            console.log('Question-by-question mark loaded (no annotations):', resultData.mark); // Debug log
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
            cleanupPdfUrl(pdfUrl);
        };
    }, [currentAnswer?.id, question?.id, assessment.id, markingMode]);

    // New useEffect for student-by-student mode data loading
    useEffect(() => {
        let cancelled = false;

        const loadStudentAllResults = async () => {
            if (markingMode !== 'student-by-student' || !currentAnswer) return;

            try {
                // Load PDF
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/uploaded-files/${currentAnswer.id}/answer-sheet`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                if (!cancelled) setPdfUrl(url);

                // Load all question results for this student
                const resultsRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/question-results/student/${currentAnswer.student_id}/assessment/${assessment.id}/all-results`
                );

                if (resultsRes.ok) {
                    const studentData: StudentAllResults = await resultsRes.json();
                    if (!cancelled) {
                        console.log('Fresh student data loaded:', studentData); // Debug log
                        if (setStudentAllResults) {
                            setStudentAllResults(studentData);
                        }
                        
                        // Load all annotations for all questions
                        const allAnnotations: Record<string, AnnotationLayerProps['annotations']> = {};
                        
                        for (const questionData of studentData.questions) {
                            if (questionData.annotation) {
                                const annotationKey = getAnnotationKey(currentAnswer.student_id, questionData.page_number);
                                allAnnotations[annotationKey] = questionData.annotation;
                            }
                        }
                        
                        setAnnotationsByPage(allAnnotations);
                    }
                } else {
                    console.error('Failed to fetch student results');
                    if (!cancelled && setStudentAllResults) {
                        setStudentAllResults(null);
                    }
                }
            } catch (err) {
                console.error('Error loading student data:', err);
                if (!cancelled) setPdfUrl(null);
            }
        };

        if (markingMode === 'student-by-student') {
            // Clear all previous data to prevent stale state
            setSelectedMark(null); // Clear question-by-question state
            setPdfUrl(null);
            setPdfReady(false);
            setRenderedPages(new Set());
            setAnnotationsByPage({});
            
            // Only clear student data if we're managing it locally
            if (setStudentAllResults && !propStudentAllResults) {
                setStudentAllResults(null); // Important: clear stale data immediately
            }
            
            loadStudentAllResults();
        } else if (markingMode === 'question-by-question') {
            // Clear student-by-student state when switching to question-by-question
            setRenderedPages(new Set());
            if (setStudentAllResults && !propStudentAllResults) {
                setStudentAllResults(null);
            }
        }

        return () => {
            cancelled = true;
            if (markingMode === 'student-by-student') {
                cleanupPdfUrl(pdfUrl);
            }
        };
    }, [currentAnswer?.id, assessment.id, markingMode]);


    const saveAnnotations = async (questionId?: string, pageNumber?: number) => {
        if (!currentAnswer) return;

        // For question-by-question mode, use current question
        // For student-by-student mode, use provided questionId and pageNumber
        const finalQuestionId = questionId || question?.id;
        const finalPageNumber = pageNumber || question?.page_number;
        
        if (!finalQuestionId || !finalPageNumber) return;

        const annotationKey = getAnnotationKey(currentAnswer.student_id, finalPageNumber);
        const annotations = annotationsByPage[annotationKey] ?? { lines: [], texts: [], stickyNotes: [] };

        // Ensure the page number is included in the annotation data
        const annotationsWithPage = {
            ...annotations,
            page: finalPageNumber
        };

        const blob = new Blob([JSON.stringify(annotationsWithPage)], { type: 'application/json' });
        const formData = new FormData();
        formData.append('assessment_id', assessment.id);
        formData.append('question_id', finalQuestionId);
        formData.append('student_id', currentAnswer.student_id);
        
        // IMPORTANT: Don't send mark when saving annotations only
        // The mark should only be updated through explicit mark update functions
        formData.append('mark', '0'); // Send 0 as placeholder - backend should ignore this
        formData.append('annotation_only', 'true'); // Flag to indicate annotation-only save
        formData.append('file', blob, 'annotations.json');

        try {
            await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/question-results/upload-annotation`, {
                method: 'POST',
                body: formData,
            });
            console.log('Annotations saved (mark unchanged)');
        } catch (err) {
            console.error('Failed to save annotations', err);
        }
    };

    // Auto-save annotations whenever they change
    useEffect(() => {
        if (markingMode === 'question-by-question' && currentAnswer && question) {
            const annotationKey = getAnnotationKey(currentAnswer.student_id, question.page_number);
            if (annotationsByPage[annotationKey]) {
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
        } else if (markingMode === 'student-by-student' && currentAnswer && studentAllResults) {
            // In student mode, we need to save annotations for all modified pages
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            
            saveTimeoutRef.current = setTimeout(() => {
                // Save annotations for all pages that have been modified
                const promises: Promise<void>[] = [];
                
                studentAllResults.questions.forEach(questionData => {
                    const annotationKey = getAnnotationKey(currentAnswer.student_id, questionData.page_number);
                    if (annotationsByPage[annotationKey]) {
                        promises.push(saveAnnotations(questionData.id, questionData.page_number));
                    }
                });
                
                Promise.all(promises).catch(err => console.error('Failed to save some student mode annotations', err));
            }, 1000);

            return () => {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
            };
        }
    }, [annotationsByPage, currentAnswer?.id, question?.id, markingMode, studentAllResults]);

    // Cleanup effect to save any pending changes on unmount or student change
    useEffect(() => {
        return () => {
            // Clear any pending save timeout and save immediately
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            // Save any pending annotations when component unmounts or student changes
            if (currentAnswer && question) {
                const annotationKey = getAnnotationKey(currentAnswer.student_id, question.page_number);
                if (annotationsByPage[annotationKey]) {
                    // Call save immediately without timeout
                    const annotations = annotationsByPage[annotationKey] ?? { lines: [], texts: [], stickyNotes: [] };
                    
                    // Ensure the page number is included in the annotation data
                    const annotationsWithPage = {
                        ...annotations,
                        page: question.page_number
                    };
                    
                    const blob = new Blob([JSON.stringify(annotationsWithPage)], { type: 'application/json' });
                    const formData = new FormData();
                    formData.append('assessment_id', assessment.id);
                    formData.append('question_id', question.id);
                    formData.append('student_id', currentAnswer.student_id);
                    formData.append('mark', '0'); // Don't update marks in cleanup
                    formData.append('annotation_only', 'true'); // Only save annotations
                    formData.append('file', blob, 'annotations.json');

                    // Note: This will be a fire-and-forget save since we can't await in cleanup
                    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/question-results/upload-annotation`, {
                        method: 'POST',
                        body: formData,
                    }).catch(err => console.error('Failed to save annotations on cleanup', err));
                }
            }
        };
    }, [currentAnswer?.id, question?.id, annotationsByPage, assessment.id]);

    const goToNext = async () => {
        updateCurrentIndex((i: number) => Math.min(i + 1, answers.length - 1));
    };

    const goToPrevious = async () => {
        updateCurrentIndex((i: number) => Math.max(i - 1, 0));
    };

    // Find next unmarked student/question
    const goToNextUnmarked = async () => {
        if (markingMode === 'question-by-question' && question) {
            // Find next student where this question is unmarked
            for (let i = currentIndex + 1; i < answers.length; i++) {
                try {
                    const res = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/question-results?assessment_id=${assessment.id}&question_id=${question.id}&student_id=${answers[i].student_id}`
                    );
                    const result = await res.json();
                    if (result.mark === null || result.mark === undefined) {
                        updateCurrentIndex(i);
                        return;
                    }
                } catch (err) {
                    console.error('Error checking student mark:', err);
                }
            }
        } else if (markingMode === 'student-by-student') {
            // Find next student with any unmarked question
            for (let i = currentIndex + 1; i < answers.length; i++) {
                try {
                    const res = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/question-results/student/${answers[i].student_id}/assessment/${assessment.id}/all-results`
                    );
                    const studentData: StudentAllResults = await res.json();
                    const hasUnmarked = studentData.questions.some(q => q.mark === null || q.mark === undefined);
                    if (hasUnmarked) {
                        updateCurrentIndex(i);
                        return;
                    }
                } catch (err) {
                    console.error('Error checking student results:', err);
                }
            }
        }
    };

    // Find previous unmarked student/question
    const goToPreviousUnmarked = async () => {
        if (markingMode === 'question-by-question' && question) {
            // Find previous student where this question is unmarked
            for (let i = currentIndex - 1; i >= 0; i--) {
                try {
                    const res = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/question-results?assessment_id=${assessment.id}&question_id=${question.id}&student_id=${answers[i].student_id}`
                    );
                    const result = await res.json();
                    if (result.mark === null || result.mark === undefined) {
                        updateCurrentIndex(i);
                        return;
                    }
                } catch (err) {
                    console.error('Error checking student mark:', err);
                }
            }
        } else if (markingMode === 'student-by-student') {
            // Find previous student with any unmarked question
            for (let i = currentIndex - 1; i >= 0; i--) {
                try {
                    const res = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/question-results/student/${answers[i].student_id}/assessment/${assessment.id}/all-results`
                    );
                    const studentData: StudentAllResults = await res.json();
                    const hasUnmarked = studentData.questions.some(q => q.mark === null || q.mark === undefined);
                    if (hasUnmarked) {
                        updateCurrentIndex(i);
                        return;
                    }
                } catch (err) {
                    console.error('Error checking student results:', err);
                }
            }
        }
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

    // New functions for student-by-student mode
    const handleStudentModeMarkChange = async (questionId: string, mark: number) => {
        if (!currentAnswer || !studentAllResults) return;

        // Find the question
        const questionData = studentAllResults.questions.find(q => q.id === questionId);
        if (!questionData) {
            console.error('Question not found:', questionId);
            return;
        }

        console.log('Updating mark for question:', questionId, 'mark:', mark); // Debug log

        const formData = new FormData();
        formData.append('assessment_id', assessment.id);
        formData.append('question_id', questionId);
        formData.append('student_id', currentAnswer.student_id);
        formData.append('mark', mark.toString());

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/question-results/update-mark`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update mark: ${response.status}`);
            }
            
            // Update local state optimistically
            if (studentAllResults && setStudentAllResults) {
                const updated = {
                    ...studentAllResults,
                    questions: studentAllResults.questions.map(q => 
                        q.id === questionId ? { ...q, mark } : q
                    )
                };
                console.log('Updated shared state:', updated); // Debug log
                setStudentAllResults(updated);
            }
            
            console.log('Student mode mark saved successfully:', mark);
        } catch (err) {
            console.error('Failed to save mark in student mode', err);
            // TODO: Show user-friendly error message
        }
    };

    const getQuestionsOnPage = (pageNumber: number): QuestionWithResult[] => {
        if (!studentAllResults) return [];
        return studentAllResults.questions.filter(q => q.page_number === pageNumber);
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

    // Keyboard shortcuts for navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only handle shortcuts when not typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        goToPrevious();
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        goToNext();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [currentIndex, answers.length]);

    if (markingMode === 'question-by-question' && !question) {
        return <p className="text-muted-foreground p-4">No question selected.</p>;
    }

    if (markingMode === 'student-by-student' && !currentAnswer) {
        return <p className="text-muted-foreground p-4">No student selected.</p>;
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
                        className="border-2 border-brand-accent-400 rounded-lg relative overflow-auto pdf-container shadow-md"
                        style={{ 
                            height: 'calc(100vh - 220px)',
                            touchAction: 'pan-x pan-y', // Allow panning but prevent zoom
                            overflowX: 'hidden', // Prevent horizontal scrolling
                            overflowY: 'auto', // Allow vertical scrolling
                        }}
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
                            {pdfReady && markingMode === 'question-by-question' && question && (
                                <div className="relative" id={`page-${question.page_number}`}>
                                    <Page
                                        key={`page-${question.page_number}-${containerWidth}-${pdfVersion}`}
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
                                            key={`${currentAnswer?.id}-${question.id}-${question.page_number}-${pdfVersion}`}
                                            page={question.page_number}
                                            annotations={annotationsByPage[getAnnotationKey(currentAnswer?.student_id || '', question.page_number)] ?? { lines: [], texts: [], stickyNotes: [] }}
                                            setAnnotations={(data) => {
                                                const annotationKey = getAnnotationKey(currentAnswer?.student_id || '', question.page_number);
                                                setAnnotationsByPage((prev) => ({
                                                    ...prev,
                                                    [annotationKey]: data,
                                                }));
                                            }}
                                            tool={tool}
                                            containerRef={pageContainerRef}
                                            rendered={renderedPage === question.page_number}
                                        />
                                    )}
                                    {/* Question highlight for question-by-question mode */}
                                    {!isResizing && (() => {
                                        const pdfPageElement = document.querySelector(`#page-${question.page_number} .react-pdf__Page`);
                                        if (!pdfPageElement) return null;

                                        const pageRect = pdfPageElement.getBoundingClientRect();
                                        const pageSize = { width: pageRect.width, height: pageRect.height };
                                        const percentageCoords: PercentageCoordinates = {
                                            x: question.x, y: question.y, width: question.width, height: question.height,
                                        };
                                        const pixelCoords = percentageToPixels(percentageCoords, pageSize);

                                        return (
                                            <>
                                                <div
                                                    ref={highlightRef}
                                                    key={`highlight-${question.id}-${pdfVersion}`}
                                                    className="absolute border-2 border-blue-500 pointer-events-none"
                                                    style={{
                                                        top: pixelCoords.y, left: pixelCoords.x,
                                                        width: pixelCoords.width, height: pixelCoords.height, zIndex: 10,
                                                    }}
                                                />
                                                {question.max_marks !== undefined && (
                                                    <div
                                                        key={`marks-${question.id}-${pdfVersion}`}
                                                        className="absolute right-0 flex flex-col pr-2"
                                                        style={{
                                                            top: pixelCoords.y + pixelCoords.height / 2,
                                                            transform: 'translateY(-50%)', zIndex: 15,
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
                                                                    className={`text-sm rounded px-2 py-1 mb-1 border transition-colors touch-manipulation min-h-[44px] min-w-[44px] touch-target ${selectedMark === value
                                                                        ? 'bg-green-200 border-green-500 font-semibold'
                                                                        : 'bg-white border-gray-300 hover:bg-blue-100 active:bg-blue-200'
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

                            {/* Student-by-student mode: Render all pages with question overlays */}
                            {pdfReady && markingMode === 'student-by-student' && numPages && (
                                <div className="space-y-8">
                                    {Array.from(new Array(numPages), (el, index) => {
                                        const pageNumber = index + 1;
                                        const questionsOnThisPage = getQuestionsOnPage(pageNumber);
                                        
                                        return (
                                            <div key={`page-${pageNumber}`} className="relative" id={`page-${pageNumber}`}>
                                                <Page
                                                    key={`page-${pageNumber}-${containerWidth}-${pdfVersion}`}
                                                    pageNumber={pageNumber}
                                                    width={containerWidth ? Math.max(containerWidth - 32, 400) : 500}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    onRenderSuccess={() => {
                                                        setRenderedPages(prev => new Set([...prev, pageNumber]));
                                                    }}
                                                />
                                                
                                                {/* Annotation Layer for this page */}
                                                {renderedPages.has(pageNumber) && !isResizing && (
                                                    <AnnotationLayer
                                                        key={`${currentAnswer?.id}-${pageNumber}-${pdfVersion}`}
                                                        page={pageNumber}
                                                        annotations={annotationsByPage[getAnnotationKey(currentAnswer?.student_id || '', pageNumber)] ?? { lines: [], texts: [], stickyNotes: [] }}
                                                        setAnnotations={(data) => {
                                                            const annotationKey = getAnnotationKey(currentAnswer?.student_id || '', pageNumber);
                                                            setAnnotationsByPage((prev) => ({
                                                                ...prev,
                                                                [annotationKey]: data,
                                                            }));
                                                        }}
                                                        tool={tool}
                                                        containerRef={pageContainerRef}
                                                        rendered={renderedPages.has(pageNumber)}
                                                    />
                                                )}

                                                {/* Question overlays for this page */}
                                                {renderedPages.has(pageNumber) && !isResizing && questionsOnThisPage.map(questionData => {
                                                    const pdfPageElement = document.querySelector(`#page-${pageNumber} .react-pdf__Page`);
                                                    if (!pdfPageElement) return null;

                                                    const pageRect = pdfPageElement.getBoundingClientRect();
                                                    
                                                    return (
                                                        <QuestionOverlay
                                                            key={`overlay-${questionData.id}-${pageNumber}`}
                                                            question={questionData}
                                                            onMarkChange={handleStudentModeMarkChange}
                                                            pageWidth={pageRect.width}
                                                            pageHeight={pageRect.height}
                                                            isSelected={selectedQuestionId === questionData.id}
                                                            onSelect={() => setSelectedQuestionId(questionData.id)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Document>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4 font-raleway">
                        <Button
                            variant="outline"
                            onClick={goToPreviousUnmarked}
                            disabled={currentIndex <= 0}
                            className="touch-manipulation min-h-[44px] border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            title={markingMode === 'question-by-question' ? 'Skip to previous unmarked student for this question' : 'Skip to previous student with unmarked questions'}
                        >
                            ← Prev Unmarked
                        </Button>
                        <Button
                            variant="outline"
                            onClick={goToPrevious}
                            disabled={currentIndex <= 0}
                            className="touch-manipulation min-h-[44px] border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous Student
                        </Button>
                        <p className="text-sm font-semibold text-brand-primary-700 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 px-4 py-2 rounded-lg border-2 border-brand-accent-200">
                            Student {currentIndex + 1} of {answers.length}
                        </p>
                        <Button
                            variant="outline"
                            onClick={goToNext}
                            disabled={currentIndex >= answers.length - 1}
                            className="touch-manipulation min-h-[44px] border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next Student
                        </Button>
                        <Button
                            variant="outline"
                            onClick={goToNextUnmarked}
                            disabled={currentIndex >= answers.length - 1}
                            className="touch-manipulation min-h-[44px] border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            title={markingMode === 'question-by-question' ? 'Skip to next unmarked student for this question' : 'Skip to next student with unmarked questions'}
                        >
                            Next Unmarked →
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">
                    {markingMode === 'question-by-question' 
                        ? 'Loading answer sheet PDF...' 
                        : 'Loading student answer sheet...'
                    }
                </p>
            )}
        </div>
    );
}
