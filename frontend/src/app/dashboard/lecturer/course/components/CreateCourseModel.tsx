import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { DialogDescription } from '@radix-ui/react-dialog';

interface AddCourseForm {
    title: string;
    code?: string;
}

interface AddCourseModalProps {
    onCourseAdded?: () => void;
}

export default function AddCourseModal({ onCourseAdded }: AddCourseModalProps) {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset } = useForm<AddCourseForm>();

    const onSubmit = async (data: AddCourseForm) => {
        try {
            const userRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/users/me`)
            const user = await userRes.json();
            const teacherId = user.id;
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    teacher_id: teacherId,
                }),
            });

            if (!response.ok) throw new Error('Failed to create course');

            reset();
            setOpen(false);
            onCourseAdded?.();
        } catch (error) {
            console.error('Error adding course:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-brand-accent-50">
                    <Plus className="w-5 h-5 text-brand-primary" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-4 border-brand-accent font-raleway">
                <DialogHeader>
                    <DialogTitle className="text-brand-primary text-xl font-bold">Add New Course</DialogTitle>
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
                            Create Course
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
