import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useState } from 'react';

interface QuestionCreateForm {
    question_number: string;
    max_marks?: number;
    increment?: number;
    memo?: string;
    marking_note?: string;
}

interface InitialData {
    assessment_id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page_number: number;
}

interface CreateQuestionFormModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    initialData: InitialData;
    onCreated?: () => void;
}

export default function CreateQuestionFormModal({
    open,
    setOpen,
    initialData,
    onCreated,
}: CreateQuestionFormModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<QuestionCreateForm>();

    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: QuestionCreateForm) => {
        setLoading(true);
        try {
            const payload = {
                ...data,
                ...initialData,
            };

            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/questions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to create question');

            reset();
            setOpen(false);
            onCreated?.();
        } catch (err) {
            console.error('Create question failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Question</DialogTitle>
                    <DialogDescription className="sr-only">
                        Provide details for the selected question area
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div>
                        <Input
                            placeholder="Question Number"
                            {...register('question_number', { required: 'This is required' })}
                        />
                        {errors.question_number && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.question_number.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="Max Marks"
                            {...register('max_marks')}
                        />
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="Increment"
                            {...register('increment')}
                        />
                    </div>

                    <div>
                        <Textarea placeholder="Memo" {...register('memo')} />
                    </div>

                    <div>
                        <Textarea placeholder="Marking Note" {...register('marking_note')} />
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>Page: {initialData.page_number}</p>
                        <p>
                            Box: ({initialData.x.toFixed(1)}, {initialData.y.toFixed(1)}) •{' '}
                            {initialData.width.toFixed(1)} x {initialData.height.toFixed(1)}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Question'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
