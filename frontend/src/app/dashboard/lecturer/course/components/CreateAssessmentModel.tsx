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
import { DialogDescription } from '@radix-ui/react-dialog';
import { assessmentService } from '@/services';
import { API_CONFIG } from '@/lib/constants';

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

            // Create assessment using service
            const createdAssessment = await assessmentService.createAssessment({
                course_id: courseId,
                title: data.title || 'Untitled Assessment',
                total_marks: 0, // Will be updated when questions are mapped
            });

            assessmentId = createdAssessment.id;
            console.log('Created Assessment:', createdAssessment);

            // Upload question paper if file is provided
            if (file && assessmentId) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('course_id', courseId);
                formData.append('assessment_id', assessmentId);

                const token = localStorage.getItem('authToken');
                const uploadRes = await fetch(`${API_CONFIG.BASE_URL}/assessments/upload/question-paper`, {
                    method: 'POST',
                    headers: {
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error('File upload failed');

                const { file_path } = await uploadRes.json();

                // Update assessment with file path
                await assessmentService.updateAssessment(assessmentId, {
                    question_paper_file_path: file_path,
                });
            }

            reset();
            setFile(null);
            setOpen(false);
            onAssessmentCreated?.();
            
            // Dispatch event to notify PDF viewer if a question paper was uploaded
            if (file) {
                window.dispatchEvent(new Event('question-paper-updated'));
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to create assessment: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
            <DialogContent className="bg-white border-4 border-brand-accent font-raleway">
                <DialogHeader>
                    <DialogTitle className="text-brand-primary text-xl font-bold">Create Assessment</DialogTitle>
                    <DialogDescription className="sr-only">Add a title and optionally upload a PDF</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div>
                        <Input
                            placeholder="Assessment Title"
                            {...register('title', { required: 'Title is required' })}
                            className="border-2 border-brand-accent-300 focus:ring-brand-primary focus:border-brand-primary bg-white"
                        />
                        {errors.title && (
                            <p className="text-sm text-red-500 mt-1 font-medium">{errors.title.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-2">
                            Upload Question Paper (PDF)
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0];
                                if (selectedFile) {
                                    setFile(selectedFile);
                                }
                            }}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-brand-accent-300 file:text-sm file:font-semibold file:bg-brand-accent-50 file:text-brand-primary hover:file:bg-brand-accent-100 cursor-pointer"
                        />
                        {file && (
                            <p className="text-sm text-brand-accent-700 mt-2 font-medium">Selected: {file.name}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button 
                            type="submit" 
                            disabled={uploading}
                            className="bg-brand-primary hover:bg-brand-primary-700 text-white font-semibold disabled:opacity-50"
                        >
                            {uploading ? 'Uploading...' : 'Create Assessment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
