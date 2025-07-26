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
import { MoreVertical } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Question } from '@/types/course';

interface GradingRightPanelProps {
    selectedAssessment: { id: string; title: string };
    currentPage: number;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    question: Question | null;
    onQuestionSelect: (question: Question) => void;
    width?: number;
}

export default function GradingRightPanel({
    selectedAssessment,
    currentPage,
    pageContainerRef,
    question,
    onQuestionSelect,
    width = 230,
}: GradingRightPanelProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${selectedAssessment.id}/questions`);
            const data: Question[] = await res.json();
            setQuestions(data);

            if (!question && data.length > 0) {
                onQuestionSelect(data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch questions:', err);
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [selectedAssessment]);

    if (!question) {
        return <div className="p-4 text-muted-foreground">No question selected.</div>;
    }

    return (
        <div className="p-4" style={{ width: `${width}px`, minWidth: `${width}px` }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Question</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-64 overflow-auto" align="end">
                        {questions.map((q) => (
                            <DropdownMenuItem
                                key={q.id}
                                onClick={() => onQuestionSelect(q)}
                                className={q.id === question.id ? 'font-semibold bg-muted' : ''}
                            >
                                Question {q.question_number}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Accordion type="single" defaultValue="question" collapsible>
                <AccordionItem value="question">
                    <AccordionTrigger className="text-left">Details</AccordionTrigger>
                    <AccordionContent className="p-2 text-sm space-y-1">
                        <p><strong>Question #:</strong> {question.question_number}</p>
                        <p><strong>Max Marks:</strong> {question.max_marks ?? '—'}</p>
                        <p><strong>Increment:</strong> {question.increment ?? '—'}</p>
                        <p><strong>Memo:</strong> {question.memo ?? '—'}</p>
                        <p><strong>Marking Note:</strong> {question.marking_note ?? '—'}</p>
                        <p><strong>Page:</strong> {question.page_number}</p>
                        <p><strong>Box:</strong> {`x: ${question.x}, y: ${question.y}, w: ${question.width}, h: ${question.height}`}</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
