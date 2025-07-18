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

interface CreateAssessmentForm {
    title?: string;
}

interface CreateAssessmentModalProps {
    courseId: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    onAssessmentCreated?: () => void;
}

export default function CreateAssessmentModal({
    courseId,
    open,
    setOpen,
    onAssessmentCreated,
}: CreateAssessmentModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateAssessmentForm>();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const onSubmit = async (data: CreateAssessmentForm) => {
        let assessmentId: string | null = null;

        try {
            setUploading(true);

            const createRes = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: data.title,
                        course_id: courseId,
                        question_paper_file_path: null,
                    }),
                }
            );

            if (!createRes.ok) throw new Error('Assessment creation failed');

            const createdAssessment = await createRes.json();
            assessmentId = createdAssessment.id;
            console.log('Created Assessment:', createdAssessment);

            if (file && assessmentId) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('course_id', courseId);
                formData.append('assessment_id', assessmentId);

                const uploadRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/assessments/upload/question-paper`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );

                if (!uploadRes.ok) throw new Error('File upload failed');

                const { file_path } = await uploadRes.json();

                await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessmentId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            question_paper_file_path: file_path,
                        }),
                    }
                );
            }

            reset();
            setFile(null);
            setOpen(false);
            onAssessmentCreated?.();
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setUploading(false);
        }
    };


    useEffect(() => {
        if (open) {
            reset();
            setFile(null);
        }
    }, [open, reset]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Assessment</DialogTitle>
                    <DialogDescription className="sr-only">Add a title and optionally upload a PDF</DialogDescription>
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
                            {uploading ? 'Uploading...' : 'Create Assessment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
