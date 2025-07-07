import { useState, useEffect } from 'react';
import AssessmentBar from '@components/AssessmentBar';
import EditAssessmentModel from '@/components/EditAssessmentModel';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

type AssessmentAction = 'edit' | 'map' | 'upload' | 'export' | 'delete';

interface Assessment {
    id: string;
    title: string;
}

interface AssessmentMainPanelProps {
    selectedAssessment?: Assessment | null;
}

const actionPanels: {
    key: AssessmentAction;
    title: string;
    content: string;
    className?: string;
}[] = [
        {
            key: 'map',
            title: 'Map View',
            content: 'Render your interactive map or GIS tool here.',
            className: 'bg-blue-100',
        },
        {
            key: 'upload',
            title: 'Upload Files',
            content: 'Upload form UI goes here.',
        },
        {
            key: 'export',
            title: 'Export Assessment',
            content: 'Export options / download actions go here.',
        },
    ];

export default function AssessmentMainPanel({
    selectedAssessment,
}: AssessmentMainPanelProps) {
    const [activeAction, setActiveAction] = useState<AssessmentAction | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);


    const panel = actionPanels.find((p) => p.key === activeAction);

    // Show modal dialogs when action changes
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
            <AssessmentBar onAction={setActiveAction} selectedAction={activeAction} />

            {/* <div className={`flex-1 overflow-auto p-4 ${panel?.className || 'text-gray-500'}`}> */}
            {selectedAssessment ? (
                <div className="mb-4">
                    {activeAction === 'map' ? (
                        pdfUrl ? (
                            <div className="w-full h-[80vh] border rounded overflow-hidden">
                                <iframe
                                    src={pdfUrl}
                                    title="Assessment PDF"
                                    className="w-full h-full"
                                    style={{ border: 'none' }}
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-red-500">{pdfError || 'No question paper available.'}</p>
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

            {/* {panel ? (
                <>
                    <h2 className="text-xl font-semibold">{panel.title}</h2>
                    <p>{panel.content}</p>
                </>
            ) : (
                <p>Select an action from the toolbar above.</p>
            )} */}
            {/* </div> */}

            {/* Edit Modal */}
            {selectedAssessment && (
                <EditAssessmentModel
                    open={editModalOpen}
                    setOpen={(open: boolean | ((prevState: boolean) => boolean)) => {
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
