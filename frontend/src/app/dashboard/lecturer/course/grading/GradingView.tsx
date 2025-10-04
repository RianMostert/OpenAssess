import { useRef, useState } from 'react';
import GradingPdfViewer from '@dashboard/lecturer/course/grading/GradingPdfViewer';
import GradingRightPanel from '@dashboard/lecturer/course/grading/GradingRightPanel';
import { Assessment, Question, GradingMode, StudentAllResults } from '@/types/course';

interface GradingLayoutProps {
    assessment: Assessment;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function GradingLayout({ assessment, isMobile = false, isTablet = false }: GradingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [question, setQuestion] = useState<Question | null>(null);
    const [gradingMode, setGradingMode] = useState<GradingMode>('question-by-question');
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
                    <GradingPdfViewer
                        assessment={assessment}
                        question={question}
                        pageContainerRef={pageContainerRef}
                        gradingMode={gradingMode}
                        currentStudentIndex={currentStudentIndex}
                        onStudentIndexChange={setCurrentStudentIndex}
                        studentAllResults={studentAllResults}
                        onStudentAllResultsChange={setStudentAllResults}
                        onRefreshStudentData={refreshStudentData}
                        // isMobile={isMobile}
                        // isTablet={isTablet}
                    />
                </div>

                <GradingRightPanel
                    selectedAssessment={assessment}
                    pageContainerRef={pageContainerRef}
                    question={question}
                    onQuestionSelect={(q) => setQuestion(q)}
                    gradingMode={gradingMode}
                    onGradingModeChange={setGradingMode}
                    currentStudentIndex={currentStudentIndex}
                    onStudentIndexChange={setCurrentStudentIndex}
                    studentAllResults={studentAllResults}
                    onStudentAllResultsChange={setStudentAllResults}
                    width={isTablet ? 250 : 300}
                />
            </div>
        );
    }
