import { useRef, useState } from 'react';
import GradingPdfViewer from '@dashboard/course/grading/GradingPdfViewer';
import GradingRightPanel from '@dashboard/course/grading/GradingRightPanel';
import { Assessment, Question } from '@/types/course';

interface GradingLayoutProps {
    assessment: Assessment;
}

export default function GradingLayout({ assessment }: GradingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [question, setQuestion] = useState<Question | null>(null);

    return (
        <div className="flex h-screen w-full border-r border-zinc-800">
            <div className="flex-1 h-full overflow-auto" ref={pageContainerRef}>
                <GradingPdfViewer
                    assessment={assessment}
                    question={question}
                    pageContainerRef={pageContainerRef}
                />
            </div>

            <div className="h-full overflow-auto border-l border-zinc-800">
                <GradingRightPanel
                    selectedAssessment={assessment}
                    currentPage={currentPage}
                    pageContainerRef={pageContainerRef}
                    question={question}
                    onQuestionSelect={(q) => setQuestion(q)}
                />
            </div>
        </div>
    );
}
