import { useEffect, useRef, useState } from 'react';
import CourseLeftPanel from '@dashboard/course/CourseLeftPanel';
import CourseOverview from '@dashboard/course/overview/CourseOverview';
import AssessmentOverview from '@dashboard/course/overview/AssessmentOverview';
import MappingLayout from '@dashboard/course/mapping/MappingView';
import GradingLayout from '@dashboard/course/grading/GradingView';

import { Course, Assessment } from '@/types/course';

interface CourseViewProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function CourseView({ isCollapsed, onToggleCollapse, isMobile = false, isTablet = false }: CourseViewProps) {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [activeMode, setActiveMode] = useState<'view' | 'map' | 'grade'>('view');

    const prevAssessmentId = useRef<string | null>(null);

    useEffect(() => {
        if (selectedAssessment?.id && prevAssessmentId.current !== selectedAssessment.id) {
            prevAssessmentId.current = selectedAssessment.id;
            setActiveMode('view');
        }
    }, [selectedAssessment]);

    return (
        <div className={`flex h-full w-full ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <CourseLeftPanel
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                selectedAssessment={selectedAssessment}
                setSelectedAssessment={setSelectedAssessment}
                assessments={[]}
                setAssessments={() => { }}
                setActiveMode={setActiveMode}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                isMobile={isMobile}
                isTablet={isTablet}
            />
            
            <div className="flex-1 overflow-hidden">
                {activeMode === 'view' && selectedCourse && !selectedAssessment && (
                    <CourseOverview
                        course={selectedCourse}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}

                {activeMode === 'view' && selectedCourse && selectedAssessment && (
                    <AssessmentOverview
                        course={selectedCourse}
                        assessment={selectedAssessment}
                        setActiveMode={setActiveMode}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}

                {!selectedCourse && (
                    <div className={`${isMobile ? 'p-4' : 'p-6'} text-muted-foreground`}>
                        Select a course to get started
                    </div>
                )}

                {activeMode === 'map' && selectedAssessment && (
                    <MappingLayout 
                        assessment={selectedAssessment}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}

                {activeMode === 'grade' && selectedAssessment && (
                    <GradingLayout 
                        assessment={selectedAssessment}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}
            </div>
        </div>
    );
}
