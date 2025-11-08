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
            <DialogContent className="bg-white border-4 border-brand-accent font-raleway">
                <DialogHeader>
                    <DialogTitle className="text-brand-primary text-xl font-bold">Edit Course</DialogTitle>
                    <DialogDescription className='sr-only'>Dialog goes here</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <Input 
                        placeholder="Course Title" 
                        {...register('title', { required: true })} 
                        className="border-2 border-brand-accent-300 focus:ring-brand-primary focus:border-brand-primary bg-white"
                    />
                    <Input 
                        placeholder="Course Code (optional)" 
                        {...register('code')} 
                        className="border-2 border-brand-accent-300 focus:ring-brand-primary focus:border-brand-primary bg-white"
                    />
                    <DialogFooter>
                        <Button 
                            type="submit" 
                            className="bg-brand-primary hover:bg-brand-primary-700 text-white font-semibold"
                        >
                            Update Course
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );

}
