import { useEffect, useRef, useState } from 'react';
import CourseLeftPanel from '@dashboard/course/CourseLeftPanel';
import CourseOverview from '@dashboard/course/overview/CourseOverview';
import MappingLayout from '@dashboard/course/mapping/MappingView';

import { Course, Assessment } from '@/types/course';

export default function CourseView() {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [activeMode, setActiveMode] = useState<'view' | 'map' | 'grade'>('view');

    const prevAssessmentId = useRef<string | null>(null);

    useEffect(() => {
        if (selectedAssessment?.id && selectedAssessment.id !== prevAssessmentId.current) {
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

        </div>

    );
}
