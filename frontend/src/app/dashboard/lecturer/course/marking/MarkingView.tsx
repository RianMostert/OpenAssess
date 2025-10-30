import { useRef, useState } from 'react';
import MarkingPdfViewer from '@dashboard/lecturer/course/marking/MarkingPdfViewer';
import MarkingRightPanel from '@dashboard/lecturer/course/marking/MarkingRightPanel';
import { Assessment, Question, MarkingMode, StudentAllResults } from '@/types/course';

interface MarkingLayoutProps {
    assessment: Assessment;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function MarkingLayout({ assessment, isMobile = false, isTablet = false }: MarkingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [question, setQuestion] = useState<Question | null>(null);
    const [markingMode, setMarkingMode] = useState<MarkingMode>('question-by-question');
    const [currentStudentIndex, setCurrentStudentIndex] = useState<number>(0);
    
    // Centralized student data state
    const [studentAllResults, setStudentAllResults] = useState<StudentAllResults | null>(null);
    
    // Force refresh trigger for student data
    const refreshStudentData = () => {
        setStudentAllResults(null); // This will trigger a refetch in components
    };

    return (
        <div className={`flex h-full w-full ${isMobile ? 'flex-col' : 'flex-row'}`}>
                <div className="flex-1 h-full overflow-auto" ref={pageContainerRef}>
                    <MarkingPdfViewer
                        assessment={assessment}
                        question={question}
                        pageContainerRef={pageContainerRef}
                        markingMode={markingMode}
                        currentStudentIndex={currentStudentIndex}
                        onStudentIndexChange={setCurrentStudentIndex}
                        studentAllResults={studentAllResults}
                        onStudentAllResultsChange={setStudentAllResults}
                        onRefreshStudentData={refreshStudentData}
                        // isMobile={isMobile}
                        // isTablet={isTablet}
                    />
                </div>

                <MarkingRightPanel
                    selectedAssessment={assessment}
                    pageContainerRef={pageContainerRef}
                    question={question}
                    onQuestionSelect={(q) => setQuestion(q)}
                    markingMode={markingMode}
                    onMarkingModeChange={setMarkingMode}
                    currentStudentIndex={currentStudentIndex}
                    onStudentIndexChange={setCurrentStudentIndex}
                    studentAllResults={studentAllResults}
                    onStudentAllResultsChange={setStudentAllResults}
                    width={isTablet ? 250 : 300}
                />
            </div>
        );
    }
