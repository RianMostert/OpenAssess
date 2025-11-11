import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Assessment, MarkingMode, StudentAllResults } from '@/types/course';
import { markingService, type MappingQuestion, type UploadedAnswer, type QuestionWithResult, type AnnotationData } from '@/services';
import PdfAnnotatorBar from '@dashboard/lecturer/course/components/PdfAnnotatorBar';
import AnnotationLayer, { AnnotationLayerProps, LineElement, TextElement, StickyNoteElement } from '@dashboard/lecturer/course/components/AnnotationLayer';
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
    question: MappingQuestion | null;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    markingMode: MarkingMode;
    currentStudentIndex?: number;
    onStudentIndexChange?: (index: number) => void;
    studentAllResults?: StudentAllResults | null;
    onStudentAllResultsChange?: (results: StudentAllResults | null) => void;
    onRefreshStudentData?: () => void;
}

type Tool = 'pencil' | 'eraser' | 'fine-eraser' | 'text-note' | 'sticky-note' | 'undo' | 'redo';

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
    
    // Undo/Redo state
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

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
                const data = await markingService.getAnswerSheets(assessment.id);
                setAnswers(data);
            } catch (err) {
                console.error('Failed to fetch student answers', err);
            }
        };

        fetchAnswers();
    }, [assessment.id]);

    // Helper function to convert API annotation format to component format
    const convertApiAnnotationsToComponent = (apiAnnotations: AnnotationData): {
        page?: number;
        lines: LineElement[];
        texts: TextElement[];
        stickyNotes: StickyNoteElement[];
    } => {
        return {
            page: apiAnnotations.page,
            lines: apiAnnotations.lines.map((line, index) => ({
                id: `line-${index}`,
                tool: (line.tool || 'pencil') as 'pencil' | 'fine-eraser', // Default to pencil for old data
                points: line.points,
                stroke: line.color,
                strokeWidth: line.width,
                globalCompositeOperation: line.globalCompositeOperation || 'source-over',
            })),
            texts: apiAnnotations.texts.map((text, index) => ({
                id: `text-${index}`,
                tool: 'text-note' as const,
                x: text.x,
                y: text.y,
                text: text.text,
                fontSize: 16, // Default font size
                fill: text.color,
            })),
            stickyNotes: apiAnnotations.stickyNotes.map((note, index) => ({
                id: `sticky-${index}`,
                tool: 'sticky-note' as const,
                x: note.x,
                y: note.y,
                text: note.text,
                fontSize: 16, // Default font size
                fill: note.color,
                width: 200, // Default width
                height: 200, // Default height
            })),
        };
    };

    // Helper function to convert component annotation format back to API format
    const convertComponentAnnotationsToApi = (componentAnnotations: {
        page?: number;
        lines: LineElement[];
        texts: TextElement[];
        stickyNotes: StickyNoteElement[];
    }): AnnotationData => {
        return {
            page: componentAnnotations.page || 1,
            // Save ALL lines including tool type and composition for fine-eraser masks
            lines: componentAnnotations.lines.map(line => ({
                points: line.points,
                color: line.stroke,
                width: line.strokeWidth,
                tool: line.tool === 'fine-eraser' ? 'fine-eraser' : 'pencil',
                globalCompositeOperation: line.globalCompositeOperation,
            })),
            texts: componentAnnotations.texts.map(text => ({
                x: text.x,
                y: text.y,
                text: text.text,
                color: text.fill,
            })),
            stickyNotes: componentAnnotations.stickyNotes.map(note => ({
                x: note.x,
                y: note.y,
                text: note.text,
                color: note.fill,
            })),
        };
    };

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
                const url = await markingService.getAnswerSheetPdf(currentAnswer.id);
                if (!cancelled) setPdfUrl(url);

                // Load the student's question result
                const resultData = await markingService.getQuestionResult(
                    assessment.id,
                    question.id,
                    currentAnswer.student_id
                );

                // Fetch annotations if result exists
                const annotationsJson = await markingService.getAnnotation(resultData.id);
                console.log('Annotations loaded:', annotationsJson);

                if (!cancelled) {
                    // Use student-specific key for annotations
                    const annotationKey = getAnnotationKey(currentAnswer.student_id, question.page_number);
                    const convertedAnnotations = convertApiAnnotationsToComponent(annotationsJson);
                    setAnnotationsByPage(prev => ({
                        ...prev,
                        [annotationKey]: convertedAnnotations,
                    }));
                    setSelectedMark(resultData.mark ?? null);
                    console.log('Question-by-question mark loaded:', resultData.mark); // Debug log
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
                const url = await markingService.getAnswerSheetPdf(currentAnswer.id);
                if (!cancelled) setPdfUrl(url);

                // Load all question results for this student
                const studentData = await markingService.getStudentAllResults(
                    currentAnswer.student_id,
                    assessment.id
                );

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
                            // Convert from API format to component format
                            allAnnotations[annotationKey] = convertApiAnnotationsToComponent(questionData.annotation);
                        }
                    }
                    
                    setAnnotationsByPage(allAnnotations);
                }
            } catch (err) {
                console.error('Error loading student data:', err);
                if (!cancelled) setPdfUrl(null);
                if (!cancelled && setStudentAllResults) {
                    setStudentAllResults(null);
                }
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

        // Convert from component format to API format
        const apiAnnotations = convertComponentAnnotationsToApi(annotationsWithPage);

        try {
            await markingService.saveAnnotation({
                assessment_id: assessment.id,
                question_id: finalQuestionId,
                student_id: currentAnswer.student_id,
                mark: 0, // Placeholder - backend should ignore when annotation_only is true
                annotation: apiAnnotations,
                annotation_only: true,
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
                    
                    // Convert to API format
                    const apiAnnotations = convertComponentAnnotationsToApi(annotationsWithPage);
                    
                    // Note: This will be a fire-and-forget save since we can't await in cleanup
                    markingService.saveAnnotation({
                        assessment_id: assessment.id,
                        question_id: question.id,
                        student_id: currentAnswer.student_id,
                        mark: 0,
                        annotation: apiAnnotations,
                        annotation_only: true,
                    }).catch((err: Error) => console.error('Failed to save annotations on cleanup', err));
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
                    const result = await markingService.getQuestionResult(
                        assessment.id,
                        question.id,
                        answers[i].student_id
                    );
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
                    const studentData = await markingService.getStudentAllResults(
                        answers[i].student_id,
                        assessment.id
                    );
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
                    const result = await markingService.getQuestionResult(
                        assessment.id,
                        question.id,
                        answers[i].student_id
                    );
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
                    const studentData = await markingService.getStudentAllResults(
                        answers[i].student_id,
                        assessment.id
                    );
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

        try {
            await markingService.updateMark({
                assessment_id: assessment.id,
                question_id: question.id,
                student_id: currentAnswer.student_id,
                mark,
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

        try {
            await markingService.updateMark({
                assessment_id: assessment.id,
                question_id: questionId,
                student_id: currentAnswer.student_id,
                mark,
            });
            
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
                onUndo={() => {
                    setTool('undo');
                    // Clear the undo tool immediately so it can be triggered again
                    setTimeout(() => setTool(null), 0);
                }}
                onRedo={() => {
                    setTool('redo');
                    // Clear the redo tool immediately so it can be triggered again
                    setTimeout(() => setTool(null), 0);
                }}
                canUndo={canUndo}
                canRedo={canRedo}
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
                                console.log('PDF loaded successfully with', numPages, 'pages');
                                setNumPages(numPages);
                                setPdfReady(true);
                            }}
                            onLoadError={(err) => {
                                console.error("PDF load error:", err);
                                setPdfReady(false);
                            }}
                            loading={
                                <div className="flex items-center justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary-600"></div>
                                    <span className="ml-2">Loading PDF...</span>
                                </div>
                            }
                        >
                            {pdfReady && markingMode === 'question-by-question' && question && (
                                <div className="flex justify-center py-4">
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
                                            onUndoRedoChange={(canUndoState, canRedoState) => {
                                                setCanUndo(canUndoState);
                                                setCanRedo(canRedoState);
                                            }}
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
                                                        onUndoRedoChange={(canUndoState, canRedoState) => {
                                                            setCanUndo(canUndoState);
                                                            setCanRedo(canRedoState);
                                                        }}
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
