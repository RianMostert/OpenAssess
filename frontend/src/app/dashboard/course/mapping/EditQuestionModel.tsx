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
import { useEffect, useState } from 'react';

interface Question {
    id: string;
    question_number: string;
    max_marks?: number;
    increment?: number;
    memo?: string;
    marking_note?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page_number: number;
    assessment_id: string;
}

interface EditQuestionModalProps {
    question: Question;
    open: boolean;
    setOpen: (open: boolean) => void;
    onUpdated?: () => void;
}

export default function EditQuestionModal({
    question,
    open,
    setOpen,
    onUpdated,
}: EditQuestionModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            question_number: question.question_number,
            max_marks: question.max_marks,
            increment: question.increment,
            memo: question.memo,
            marking_note: question.marking_note,
        },
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            reset({
                question_number: question.question_number,
                max_marks: question.max_marks,
                increment: question.increment,
                memo: question.memo,
                marking_note: question.marking_note,
            });
        }
    }, [question, open, reset]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const payload = data;

            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/questions/${question.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!res.ok) throw new Error('Failed to update question');

            setOpen(false);
            onUpdated?.();
            window.dispatchEvent(new Event('question-updated'));
        } catch (err) {
            console.error('Update question failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Question</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <Input
                        placeholder="Question Number"
                        {...register('question_number', { required: 'Required' })}
                    />
                    {errors.question_number && (
                        <p className="text-sm text-red-500">{errors.question_number.message}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input type="number" step="0.1" placeholder="Max Marks" {...register('max_marks')} />
                        <Input type="number" step="0.1" placeholder="Increment" {...register('increment')} />
                    </div>

                    <Textarea placeholder="Memo" {...register('memo')} />
                    <Textarea placeholder="Marking Note" {...register('marking_note')} />

                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>Page: {question.page_number}</p>
                        <p>
                            Box: ({question.x.toFixed(1)}, {question.y.toFixed(1)}) •{' '}
                            {question.width.toFixed(1)} x {question.height.toFixed(1)}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Question'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
