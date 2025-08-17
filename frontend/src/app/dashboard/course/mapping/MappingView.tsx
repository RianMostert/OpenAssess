import { useRef, useState } from 'react';
import MappingPdfViewer from '@dashboard/course/mapping/MappingPdfViewer';
import MappingRightPanel from '@dashboard/course/mapping/MappingRightPanel';
import { Assessment, Question } from '@/types/course';

interface MappingLayoutProps {
    assessment: Assessment;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function MappingLayout({ assessment, isMobile = false, isTablet = false }: MappingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Question | null>(null);

    return (
        <div className={`flex h-full w-full border-r border-zinc-800 ${isMobile ? 'flex-col' : 'flex-row'}`}>
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

            <div className={`${isMobile ? 'border-t' : 'border-l'} border-zinc-800 h-full overflow-auto ${
                isMobile ? 'max-h-1/3' : isTablet ? 'w-80' : 'w-96'
            }`}>
                <MappingRightPanel
                    selectedAssessment={assessment}
                    currentPage={currentPage}
                    pageContainerRef={pageContainerRef}
                    setCreatingQuestion={setCreating}
                    setEditingQuestion={setEditing}
                    // isMobile={isMobile}
                    // isTablet={isTablet}
                />
            </div>
        </div>
    );
}
