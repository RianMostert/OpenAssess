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
import { MoreVertical, Plus } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import CreateQuestionModel from '@/components/CreateQuestionModel';
// import EditQuestionModal from '@/components/EditQuestionModal';

interface Question {
    id: string;
    question_number: string;
    max_marks?: number;
    increment?: number;
    memo?: string;
    marking_note?: string;
}

interface MappingPanelProps {
    selectedAssessment: { id: string; title: string } | null;
}

export default function MappingPanel({ selectedAssessment }: MappingPanelProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [modelOpen, setModelOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [creating, setCreating] = useState(false);

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

    useEffect(() => {
        fetchQuestions();
    }, [selectedAssessment]);

    useEffect(() => {
        const handler = () => fetchQuestions();
        window.addEventListener('question-created', handler);
        return () => window.removeEventListener('question-created', handler);
    }, []);


    if (!selectedAssessment) {
        return <div className="p-4 text-muted-foreground">Select an assessment to view its questions.</div>;
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Questions</h2>
                <Button onClick={() => {
                    setCreating(true);
                    setModelOpen(true);
                }}
                    variant="ghost"
                    size="icon"
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            {loading ? (
                <div>Loading questions...</div>
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
                                        <DropdownMenuItem onClick={() => {
                                            setEditingQuestion(question);
                                            setModelOpen(true);
                                        }}>
                                            Edit
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

        </div>
    );
}
