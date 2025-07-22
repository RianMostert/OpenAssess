import { useRef, useState } from 'react';
import MappingPdfViewer from '@dashboard/course/mapping/MappingPdfViewer';
import MappingRightPanel from '@dashboard/course/mapping/MappingRightPanel';
import { Assessment, Question } from '@/types/course';

interface MappingLayoutProps {
    assessment: Assessment;
}

export default function MappingLayout({ assessment }: MappingLayoutProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Question | null>(null);

    return (
        <div className="flex h-screen w-full border-r border-zinc-800">
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
                />
            </div>

            <div className="h-full overflow-auto border-l border-zinc-800">
                <MappingRightPanel
                    selectedAssessment={assessment}
                    currentPage={currentPage}
                    pageContainerRef={pageContainerRef}
                    setCreatingQuestion={setCreating}
                    setEditingQuestion={setEditing}
                />
            </div>
        </div>
    );
}
