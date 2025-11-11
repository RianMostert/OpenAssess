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
import { questionService } from '@/services';
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

            await questionService.createQuestion(payload);

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
            <DialogContent className="font-raleway bg-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-brand-primary-800">Create Question</DialogTitle>
                    <DialogDescription className="text-brand-primary-600">
                        Provide details for the selected question area
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div>
                        <Input
                            placeholder="Question Number"
                            className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                            {...register('question_number', { required: 'This is required' })}
                        />
                        {errors.question_number && (
                            <p className="text-sm text-red-500 mt-1 font-medium">
                                {errors.question_number.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="Max Marks"
                            className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                            {...register('max_marks')}
                        />
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="Increment"
                            className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                            {...register('increment')}
                        />
                    </div>

                    <div>
                        <Textarea 
                            placeholder="Memo" 
                            className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                            {...register('memo')} 
                        />
                    </div>

                    {/* <div>
                        <Textarea 
                            placeholder="Marking Note" 
                            className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                            {...register('marking_note')} 
                        />
                    </div> */}

                    {/* <div className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 p-3 rounded-lg border-2 border-brand-accent-200">
                        <p className="text-sm font-semibold text-brand-primary-700">Page: {initialData.page_number}</p>
                        <p className="text-sm text-brand-primary-600">
                            Box: ({initialData.x.toFixed(1)}, {initialData.y.toFixed(1)}) •{' '}
                            {initialData.width.toFixed(1)} x {initialData.height.toFixed(1)}
                        </p>
                    </div> */}

                    <DialogFooter>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-brand-primary-600 hover:bg-brand-primary-700 text-white font-semibold"
                        >
                            {loading ? 'Creating...' : 'Create Question'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
