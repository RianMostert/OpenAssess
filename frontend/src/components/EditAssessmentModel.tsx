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
    assessmentId: string;
    initialTitle: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    onAssessmentUpdated?: () => void;
}

export default function EditAssessmentModal({
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

    const onSubmit = async (data: EditAssessmentForm) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessmentId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                }
            );

            if (!response.ok) throw new Error('Failed to update assessment');

            reset();
            setOpen(false);
            onAssessmentUpdated?.();
        } catch (error) {
            console.error('Error updating assessment:', error);
        }
    };

    useEffect(() => {
        if (open) {
            reset({ title: initialTitle });
        }
    }, [open, initialTitle, reset]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Assessment</DialogTitle>
                    <DialogDescription className="sr-only">
                        Update the title of the assessment.
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

                    <DialogFooter>
                        <Button type="submit">Update Assessment</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
