import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { DialogDescription } from '@radix-ui/react-dialog';

interface EditCourseForm {
    title: string;
    code?: string;
}

interface EditCourseModalProps {
    courseId: string;
    initialTitle: string;
    initialCode?: string;
    onCourseUpdated?: () => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}


export default function EditCourseModal({
    courseId,
    initialTitle,
    initialCode,
    onCourseUpdated,
    open,
    setOpen,
}: EditCourseModalProps) {
    const { register, handleSubmit, reset } = useForm<EditCourseForm>({
        defaultValues: {
            title: initialTitle,
            code: initialCode,
        },
    });

    const onSubmit = async (data: EditCourseForm) => {
        // print data
        console.log('Submitting course update:', data);
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                }
            );

            if (!response.ok) throw new Error('Failed to update course');

            reset();
            setOpen(false);
            onCourseUpdated?.();
        } catch (error) {
            console.error('Error updating course:', error);
        }
    };

    useEffect(() => {
        if (open) {
            reset({ title: initialTitle, code: initialCode });
        }
    }, [open, initialTitle, initialCode, reset]);

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Course</DialogTitle>
                    <DialogDescription className='sr-only'>Dialog goes here</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <Input placeholder="Course Title" {...register('title', { required: true })} />
                    <Input placeholder="Course Code (optional)" {...register('code')} />
                    <DialogFooter>
                        <Button type="submit">Update Course</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );

}
