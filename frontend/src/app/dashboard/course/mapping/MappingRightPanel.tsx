import { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Question } from '@/types/course';

interface MappingPanelProps {
    selectedAssessment: { id: string; title: string } | null;
    currentPage: number;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    width?: number;
    setCreatingQuestion: (val: boolean) => void;
    setEditingQuestion: (question: Question | null) => void;
}

export default function MappingPanel({
    selectedAssessment,
    currentPage,
    pageContainerRef,
    width = 250,
    setCreatingQuestion,
    setEditingQuestion,
}: MappingPanelProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const fetchQuestions = async () => {
        if (!selectedAssessment) return;
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${selectedAssessment.id}/questions`);
            const data = await res.json();
            setQuestions(data);
        } catch (err) {
            console.error('Failed to fetch questions:', err);
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (questionId: string) => {
        if (!selectedAssessment) return;

        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/questions/${questionId}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('Delete failed');

            fetchQuestions();
        } catch (err) {
            console.error('Error deleting question:', err);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [selectedAssessment]);

    useEffect(() => {
        const handler = () => fetchQuestions();
        window.addEventListener('question-created', handler);
        return () => window.removeEventListener('question-created', handler);
    }, []);

    useEffect(() => {
        const handler = () => fetchQuestions();
        window.addEventListener('question-updated', handler);
        return () => window.removeEventListener('question-updated', handler);
    }, []);

    useEffect(() => {
        const handler = () => fetchQuestions();
        window.addEventListener('question-deleted', handler);
        return () => window.removeEventListener('question-deleted', handler);
    }, []);

    if (!selectedAssessment) {
        return (
            <div
                className="p-4 text-muted-foreground"
                style={{
                    width: collapsed ? '40px' : `${width}px`,
                    minWidth: collapsed ? '40px' : `${width}px`,
                }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronLeft /> : <ChevronRight />}
                </Button>
            </div>
        );
    }

    return (
        <div
            className="transition-all duration-300 ease-in-out border-r border-zinc-800 h-full bg-white"
            style={{
                width: collapsed ? '40px' : `${width}px`,
                minWidth: collapsed ? '40px' : `${width}px`,
                overflow: 'hidden',
            }}
        >
            <div className="flex items-center justify-between mb-4 px-2 pt-2">
                {!collapsed && <h2 className="text-xl font-semibold">Questions</h2>}
                <div className="flex gap-1 items-center">
                    {!collapsed && (
                        <Button
                            onClick={() => setCreatingQuestion(true)}
                            variant="ghost"
                            size="icon"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed((prev) => !prev)}
                    >
                        {collapsed ? <ChevronLeft /> : <ChevronRight />}
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <>
                    {loading ? (
                        <div className="px-2">Loading questions...</div>
                    ) : (
                        <Accordion type="multiple">
                            {questions.map((question) => (
                                <AccordionItem key={question.id} value={question.id}>
                                    <div className="flex items-center justify-between w-full">
                                        <AccordionTrigger className="flex-1 text-left">
                                            {question.question_number}
                                        </AccordionTrigger>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => setEditingQuestion(question)}
                                                >
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(question.id)}
                                                    className="text-red-600"
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <AccordionContent>
                                        <div className="p-2 text-sm space-y-1">
                                            <p><strong>Max Marks:</strong> {question.max_marks ?? '—'}</p>
                                            <p><strong>Increment:</strong> {question.increment ?? '—'}</p>
                                            <p><strong>Memo:</strong> {question.memo ?? '—'}</p>
                                            <p><strong>Marking Note:</strong> {question.marking_note ?? '—'}</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </>
            )}
        </div>
    );
}
