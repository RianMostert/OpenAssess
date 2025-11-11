import { useRef, useState } from 'react';
import MappingPdfViewer from '@dashboard/lecturer/course/mapping/MappingPdfViewer';
import MappingRightPanel from '@dashboard/lecturer/course/mapping/MappingRightPanel';
import { Assessment } from '@/types/course';
import { type MappingQuestion } from '@/services';

interface MappingLayoutProps {
    assessment: Assessment;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function MappingLayout({ assessment, isMobile = false, isTablet = false }: MappingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<MappingQuestion | null>(null);

    return (
        <div className={`flex h-full w-full ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <div className="flex-1 h-full overflow-auto" ref={pageContainerRef}>
                <MappingPdfViewer
                    assessment={assessment}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageContainerRef={pageContainerRef}
                    creating={creating}
                    setCreatingQuestion={setCreating}
                    editing={editing}
                    setEditingQuestion={setEditing}
                    // isMobile={isMobile}
                    // isTablet={isTablet}
                />
            </div>

            <MappingRightPanel
                selectedAssessment={assessment}
                currentPage={currentPage}
                pageContainerRef={pageContainerRef}
                setCreatingQuestion={setCreating}
                setEditingQuestion={setEditing}
                width={isTablet ? 250 : 300}
                // isMobile={isMobile}
                // isTablet={isTablet}
            />
        </div>
    );
}
