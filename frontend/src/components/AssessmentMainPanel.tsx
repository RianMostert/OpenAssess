import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import AssessmentBar from '@components/AssessmentBar';
import EditAssessmentModel from '@/components/EditAssessmentModel';
import CreateQuestionModel from '@/components/CreateQuestionModel';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

type AssessmentAction = 'edit' | 'map' | 'upload' | 'export' | 'delete';

interface Assessment {
    id: string;
    title: string;
}

interface AssessmentMainPanelProps {
    selectedAssessment?: Assessment | null;
}

export default function AssessmentMainPanel({
    selectedAssessment,
}: AssessmentMainPanelProps) {
    const [activeAction, setActiveAction] = useState<AssessmentAction | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageRef = useRef<HTMLDivElement>(null);

    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!selectedAssessment) return;
        if (activeAction === 'edit') setEditModalOpen(true);
        if (activeAction === 'delete') setDeleteConfirmOpen(true);
    }, [activeAction, selectedAssessment]);

    useEffect(() => {
        const fetchPdf = async () => {
            if (!selectedAssessment || activeAction !== 'map') {
                setPdfUrl(null);
                setPdfError(null);
                return;
            }

            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/assessments/${selectedAssessment.id}/question-paper`
                );

                if (!res.ok) throw new Error('PDF not found');

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } catch (err) {
                console.error('Failed to fetch PDF:', err);
                setPdfUrl(null);
                setPdfError('Failed to load PDF.');
            }
        };

        fetchPdf();
    }, [selectedAssessment, activeAction]);

    const handleDelete = async () => {
        if (!selectedAssessment) return;

        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${selectedAssessment.id}`,
                { method: 'DELETE' }
            );

            if (!res.ok) throw new Error('Failed to delete assessment');

            setDeleteConfirmOpen(false);
            setActiveAction(null);
            // TODO: Trigger refresh or update list
        } catch (err) {
            console.error('Error deleting assessment:', err);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <AssessmentBar
                onAction={(action) => {
                    if (action === 'map') setCreating(true);
                    setActiveAction(action);
                }}
                selectedAction={activeAction}
            />

            {selectedAssessment ? (
                <div className="mb-4">
                    {activeAction === 'map' ? (
                        pdfUrl ? (
                            <div className="w-full h-[80vh] border rounded overflow-auto relative">
                                <Document
                                    file={pdfUrl}
                                    onLoadSuccess={({ numPages }) => {
                                        setNumPages(numPages);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <div ref={pageRef} className="relative">
                                        <Page
                                            pageNumber={currentPage}
                                            width={800}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                        {creating && (
                                            <CreateQuestionModel
                                                assessmentId={selectedAssessment.id}
                                                currentPage={currentPage}
                                                pageContainerRef={pageRef}
                                                onQuestionCreated={() => {
                                                    setCreating(false);
                                                }}
                                            />
                                        )}
                                    </div>
                                </Document>

                                <div className="flex items-center gap-4 mt-2 px-4">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                                        }
                                        disabled={currentPage <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <p className="text-sm text-muted-foreground">
                                        Page {currentPage} of {numPages}
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setCurrentPage((prev) =>
                                                Math.min(prev + 1, numPages || prev)
                                            )
                                        }
                                        disabled={currentPage >= (numPages || 0)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-red-500">
                                {pdfError || 'No question paper available.'}
                            </p>
                        )
                    ) : (
                        <>
                            <p>ID: {selectedAssessment.id}</p>
                            <p>Title: {selectedAssessment.title}</p>
                        </>
                    )}
                </div>
            ) : (
                <p className="mb-4 text-gray-400">No assessment selected.</p>
            )}

            {/* Edit Modal */}
            {selectedAssessment && (
                <EditAssessmentModel
                    open={editModalOpen}
                    setOpen={(open) => {
                        setEditModalOpen(open);
                        if (!open) setActiveAction(null);
                    }}
                    assessmentId={selectedAssessment.id}
                    initialTitle={selectedAssessment.title}
                    onAssessmentUpdated={() => {
                        setActiveAction(null);
                        // TODO: Trigger refresh
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Assessment</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to delete this assessment?</p>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
