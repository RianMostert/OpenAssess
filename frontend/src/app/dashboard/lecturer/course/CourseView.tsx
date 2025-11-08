import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import CourseLeftPanel from '@dashboard/lecturer/course/CourseLeftPanel';
import CourseOverview from '@dashboard/lecturer/course/overview/CourseOverview';
import AssessmentOverview from '@dashboard/lecturer/course/overview/AssessmentOverview';
import MappingLayout from '@dashboard/lecturer/course/mapping/MappingView';
import MarkingLayout from '@dashboard/lecturer/course/marking/MarkingView';

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
    const [activeMode, setActiveMode] = useState<'view' | 'map' | 'mark'>('view');

    const prevAssessmentId = useRef<string | null>(null);

    useEffect(() => {
        if (selectedAssessment?.id && prevAssessmentId.current !== selectedAssessment.id) {
            prevAssessmentId.current = selectedAssessment.id;
            setActiveMode('view');
        }
    }, [selectedAssessment]);

    const handleAssessmentUpdate = (updatedAssessment: Assessment) => {
        setSelectedAssessment(updatedAssessment);
    };

    return (
        <div className={`flex h-full w-full min-h-0 bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway ${isMobile ? 'flex-col' : 'flex-row'}`}>
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
            
            <div className="flex-1 overflow-hidden h-full min-h-0">
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
                        onAssessmentUpdate={handleAssessmentUpdate}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}

                {!selectedCourse && (
                    <div className={`${isMobile ? 'p-4' : 'p-6'} text-gray-600 h-full flex items-center justify-center`}>
                        <div className="text-center">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-brand-accent-400" />
                            <p className="text-lg font-semibold text-brand-primary">Select a course to get started</p>
                        </div>
                    </div>
                )}

                {activeMode === 'map' && selectedAssessment && (
                    <MappingLayout 
                        assessment={selectedAssessment}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}

                {activeMode === 'mark' && selectedAssessment && (
                    <MarkingLayout 
                        assessment={selectedAssessment}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}
            </div>
        </div>
    );
}
