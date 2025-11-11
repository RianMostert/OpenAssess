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
import { questionService, type MappingQuestion } from '@/services';

interface MappingPanelProps {
    selectedAssessment: { id: string; title: string } | null;
    currentPage: number;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    width?: number;
    setCreatingQuestion: (val: boolean) => void;
    setEditingQuestion: (question: MappingQuestion | null) => void;
}

export default function MappingPanel({
    selectedAssessment,
    currentPage,
    pageContainerRef,
    width = 250,
    setCreatingQuestion,
    setEditingQuestion,
}: MappingPanelProps) {
    const [questions, setQuestions] = useState<MappingQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const fetchQuestions = async () => {
        if (!selectedAssessment) return;
        setLoading(true);
        try {
            const data = await questionService.getAssessmentQuestions(selectedAssessment.id);
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
            await questionService.deleteQuestion(questionId);
            fetchQuestions();
            // Dispatch event to notify other components
            window.dispatchEvent(new Event('question-deleted'));
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
                className="border-l border-zinc-800 bg-background transition-all duration-300 ease-in-out h-full flex flex-col font-raleway"
                style={{
                    width: collapsed ? '40px' : `${width}px`,
                    minWidth: collapsed ? '40px' : `${width}px`,
                }}
            >
                <div className="p-2 flex justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? "Expand Questions Panel" : "Collapse Questions Panel"}
                        className="text-brand-primary-600 hover:text-brand-primary-800 hover:bg-brand-primary-50"
                    >
                        {collapsed ? <ChevronLeft /> : <ChevronRight />}
                    </Button>
                </div>
                {!collapsed && (
                    <div className="flex-1 flex items-center justify-center text-brand-primary-400 px-4">
                        <p className="text-center text-sm font-medium">Select an assessment to view questions</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="transition-all duration-300 ease-in-out border-l-2 border-brand-accent-400 h-full bg-white font-raleway"
            style={{
                width: collapsed ? '40px' : `${width}px`,
                minWidth: collapsed ? '40px' : `${width}px`,
                overflow: 'hidden',
            }}
        >
            <div className="flex items-center justify-between mb-4 px-3 pt-3 pb-2 border-b-2 border-brand-accent-200 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50">
                {!collapsed && <h2 className="text-xl font-bold text-brand-primary-800">Questions</h2>}
                <div className="flex gap-1 items-center">
                    {!collapsed && (
                        <Button
                            onClick={() => setCreatingQuestion(true)}
                            variant="ghost"
                            size="icon"
                            className="text-brand-primary-600 hover:text-brand-primary-800 hover:bg-brand-primary-100"
                            title="Add Question"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed((prev) => !prev)}
                        title={collapsed ? "Expand Questions Panel" : "Collapse Questions Panel"}
                        className="text-brand-primary-600 hover:text-brand-primary-800 hover:bg-brand-primary-50"
                    >
                        {collapsed ? <ChevronLeft /> : <ChevronRight />}
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <div className="flex-1 overflow-y-auto px-2">
                    {loading ? (
                        <div className="text-center py-4 text-brand-primary-600 font-medium">Loading questions...</div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-6 px-3">
                            <div className="text-brand-primary-300 mb-3">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-sm text-brand-primary-600 font-medium">
                                No questions yet. Click the + button to add one.
                            </p>
                        </div>
                    ) : (
                        <Accordion type="multiple">
                            {questions.map((question) => (
                                <AccordionItem 
                                    key={question.id} 
                                    value={question.id}
                                    className="border-b-2 border-brand-accent-200"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <AccordionTrigger className="flex-1 text-left font-semibold text-brand-primary-700 hover:text-brand-primary-900 hover:no-underline">
                                            {question.question_number}
                                        </AccordionTrigger>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="text-brand-primary-600 hover:text-brand-primary-800 hover:bg-brand-primary-50"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="border-2 border-brand-accent-400">
                                                <DropdownMenuItem
                                                    onClick={() => setEditingQuestion(question)}
                                                    className="text-brand-primary-700 hover:bg-brand-primary-50 font-medium cursor-pointer"
                                                >
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(question.id)}
                                                    className="text-red-600 hover:bg-red-50 font-medium cursor-pointer"
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <AccordionContent>
                                        <div className="p-3 text-sm space-y-2 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 rounded-lg border-2 border-brand-accent-200">
                                            <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Max Marks:</strong> {question.max_marks ?? '—'}</p>
                                            <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Increment:</strong> {question.increment ?? '—'}</p>
                                            <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Memo:</strong> {question.memo ?? '—'}</p>
                                            {/* <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Marking Note:</strong> {question.marking_note ?? '—'}</p> */}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            )}
        </div>
    );
}
