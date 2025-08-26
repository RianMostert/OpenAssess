import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { DialogDescription } from '@radix-ui/react-dialog';

interface EditAssessmentForm {
    title: string;
}

interface EditAssessmentModalProps {
    courseId: string;
    assessmentId: string;
    initialTitle: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    onAssessmentUpdated?: () => void;
}

export default function EditAssessmentModal({
    courseId,
    assessmentId,
    initialTitle,
    open,
    setOpen,
    onAssessmentUpdated,
}: EditAssessmentModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditAssessmentForm>({
        defaultValues: {
            title: initialTitle,
        },
    });

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const onSubmit = async (data: EditAssessmentForm) => {
        let uploadedPath: string | undefined;

        try {
            setUploading(true);

            // Step 1: Upload file if selected
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("course_id", courseId);
                formData.append("assessment_id", assessmentId);

                const uploadRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/assessments/upload/question-paper`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                if (!uploadRes.ok) throw new Error("File upload failed");

                const { file_path } = await uploadRes.json();
                uploadedPath = file_path;
            }

            // Step 2: Update assessment metadata
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessmentId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: data.title,
                        ...(uploadedPath && { question_paper_file_path: uploadedPath }),
                    }),
                }
            );

            if (!response.ok) throw new Error("Failed to update assessment");

            reset();
            setFile(null);
            setOpen(false);
            onAssessmentUpdated?.();
            
            // Dispatch event to notify PDF viewer if a new question paper was uploaded
            if (file) {
                window.dispatchEvent(new Event('question-paper-updated'));
            }
        } catch (error) {
            console.error("Error updating assessment:", error);
        } finally {
            setUploading(false);
        }
    };


    useEffect(() => {
        if (open) {
            reset({ title: initialTitle });
            setFile(null);
        }
    }, [open, initialTitle, reset]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Assessment</DialogTitle>
                    <DialogDescription className="sr-only">
                        Update the title or upload a new PDF for the assessment.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div>
                        <Input
                            placeholder="Assessment Title"
                            {...register('title', { required: 'Title is required' })}
                        />
                        {errors.title && (
                            <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    <div>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0];
                                if (selectedFile) {
                                    setFile(selectedFile);
                                }
                            }}
                        />
                        {file && (
                            <p className="text-sm text-gray-500 mt-1">Selected: {file.name}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={uploading}>
                            {uploading ? 'Updating...' : 'Update Assessment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
