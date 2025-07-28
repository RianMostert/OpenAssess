import { useEffect, useRef, useState } from 'react';
import CourseLeftPanel from '@dashboard/course/CourseLeftPanel';
import CourseOverview from '@dashboard/course/overview/CourseOverview';
import MappingLayout from '@dashboard/course/mapping/MappingView';
import GradingLayout from '@dashboard/course/grading/GradingView';

import { Course, Assessment } from '@/types/course';

export default function CourseView({ isCollapsed, onToggleCollapse }: { isCollapsed: boolean, onToggleCollapse: () => void }) {
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
        <div className="flex flex-1 h-full w-full">
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
            />
            {activeMode === 'view' && (
                <CourseOverview
                    course={selectedCourse}
                    assessment={selectedAssessment}
                    setActiveMode={setActiveMode}
                />
            )}

            {activeMode === 'map' && selectedAssessment && (
                <MappingLayout assessment={selectedAssessment} />
            )}

            {activeMode === 'grade' && selectedAssessment && (
                <GradingLayout assessment={selectedAssessment} />
            )}

        </div>

    );
}
