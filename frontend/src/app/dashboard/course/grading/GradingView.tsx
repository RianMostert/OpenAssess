import { useRef, useState } from 'react';
import GradingPdfViewer from '@dashboard/course/grading/GradingPdfViewer';
import GradingRightPanel from '@dashboard/course/grading/GradingRightPanel';
import { Assessment, Question } from '@/types/course';

interface GradingLayoutProps {
    assessment: Assessment;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function GradingLayout({ assessment, isMobile = false, isTablet = false }: GradingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [question, setQuestion] = useState<Question | null>(null);

    return (
        <div className={`flex h-full w-full ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <div className="flex-1 h-full overflow-auto" ref={pageContainerRef}>
                <GradingPdfViewer
                    assessment={assessment}
                    question={question}
                    pageContainerRef={pageContainerRef}
                    // isMobile={isMobile}
                    // isTablet={isTablet}
                />
            </div>

            <GradingRightPanel
                selectedAssessment={assessment}
                currentPage={currentPage}
                pageContainerRef={pageContainerRef}
                question={question}
                onQuestionSelect={(q) => setQuestion(q)}
                width={isTablet ? 250 : 300}
                // isMobile={isMobile}
                // isTablet={isTablet}
            />
        </div>
    );
}
