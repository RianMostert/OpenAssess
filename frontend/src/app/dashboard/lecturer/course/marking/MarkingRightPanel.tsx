import { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, ChevronLeft, ChevronRight, User, Users, Search } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Question, MarkingMode, UploadedAnswer, StudentAllResults } from '@/types/course';

interface MarkingRightPanelProps {
    selectedAssessment: { id: string; title: string };
    currentPage?: number;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    question: Question | null;
    onQuestionSelect: (question: Question) => void;
    markingMode: MarkingMode;
    onMarkingModeChange: (mode: MarkingMode) => void;
    currentStudentIndex?: number;
    onStudentIndexChange?: (index: number) => void;
    studentAllResults?: StudentAllResults | null;
    onStudentAllResultsChange?: (results: StudentAllResults | null) => void;
    width?: number;
}

export default function MarkingRightPanel({
    selectedAssessment,
    currentPage,
    pageContainerRef,
    question,
    onQuestionSelect,
    markingMode,
    onMarkingModeChange,
    currentStudentIndex: propCurrentStudentIndex,
    onStudentIndexChange,
    studentAllResults: propStudentResults,
    onStudentAllResultsChange,
    width = 230,
}: MarkingRightPanelProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    
    // New state for student mode
    const [students, setStudents] = useState<UploadedAnswer[]>([]);
    
    // Use shared student results when available, fallback to local state
    const studentResults = markingMode === 'student-by-student' ? propStudentResults : null;
    
    // Use prop-based student index, fallback to local state for backward compatibility
    const currentStudentIndex = propCurrentStudentIndex ?? 0;
    const setCurrentStudentIndex = onStudentIndexChange ?? (() => {});
    
    // Student search functionality
    const [studentSearch, setStudentSearch] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<UploadedAnswer[]>([]);
    const [searchFocused, setSearchFocused] = useState(false);

    // Student Search Component - reusable for both modes
    const StudentSearchComponent = () => (
        <div className="space-y-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                    type="text"
                    placeholder="Search by student number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    className="pl-10"
                    autoComplete="off"
                />
            </div>
            
            {/* Search Results */}
            {searchFocused && studentSearch.trim() !== '' && (
                <div className="bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                            <button
                                key={student.id}
                                onClick={() => handleStudentSelect(student)}
                                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                                className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                            >
                                <div className="font-medium">{student.student_number || student.student_id}</div>
                                {student.student_name && (
                                    <div className="text-xs text-muted-foreground">{student.student_name}</div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            No students found
                        </div>
                    )}
                </div>
            )}
            
            {/* Current Student Display */}
            <div className="bg-muted p-3 rounded-md">
                <div className="text-xs font-medium text-muted-foreground mb-1">CURRENT STUDENT</div>
                <div className="font-semibold">
                    {students[currentStudentIndex]?.student_number || students[currentStudentIndex]?.student_id || `Student ${currentStudentIndex + 1}`}
                </div>
                {students[currentStudentIndex]?.student_name && (
                    <div className="text-sm text-muted-foreground">{students[currentStudentIndex].student_name}</div>
                )}
            </div>
        </div>
    );

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${selectedAssessment.id}/questions`
            );
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

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${selectedAssessment.id}/answer-sheets`
            );
            const data: UploadedAnswer[] = await res.json();
            setStudents(data);
        } catch (err) {
            console.error('Failed to fetch students:', err);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // No longer needed - student results are managed centrally
    // const fetchStudentResults = async (studentId: string) => { ... }

    useEffect(() => {
        if (markingMode === 'question-by-question') {
            fetchQuestions();
            fetchStudents(); // Also fetch students for navigation
        } else if (markingMode === 'student-by-student') {
            fetchStudents();
        }
    }, [selectedAssessment, markingMode]);

    // Filter students based on search input
    useEffect(() => {
        if (studentSearch.trim() === '') {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student => 
                student.student_number?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                student.student_id?.toLowerCase().includes(studentSearch.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
    }, [students, studentSearch]);

    // Handle student selection from search
    const handleStudentSelect = (student: UploadedAnswer) => {
        const index = students.findIndex(s => s.id === student.id);
        if (index !== -1 && index !== currentStudentIndex) {
            setCurrentStudentIndex(index);
        }
        setStudentSearch('');
        setSearchFocused(false);
    };

    return (
        <div
            className={`transition-all duration-300 ease-in-out border-l border-zinc-800 h-full bg-background`}
            style={{
                width: collapsed ? '40px' : `${width}px`,
                minWidth: collapsed ? '40px' : `${width}px`,
                overflow: 'hidden',
            }}
        >
            <div className="flex items-center justify-between mb-4 px-2 pt-2">
                {!collapsed && (
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        {markingMode === 'question-by-question' ? (
                            <>
                                <Users className="w-5 h-5" />
                                Questions
                            </>
                        ) : (
                            <>
                                <User className="w-5 h-5" />
                                Students
                            </>
                        )}
                    </h2>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed((prev) => !prev)}
                    title={collapsed ? `Expand ${markingMode === 'question-by-question' ? 'Question' : 'Student'} Panel` : `Collapse ${markingMode === 'question-by-question' ? 'Question' : 'Student'} Panel`}
                >
                    {collapsed ? <ChevronLeft /> : <ChevronRight />}
                </Button>
            </div>

            {!collapsed && (
                <div className="flex-1 overflow-y-auto px-2">
                    {/* Marking Mode Selection */}
                    <div className="mb-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">MARKING MODE</div>
                        <div className="flex flex-col gap-1">
                            <button 
                                onClick={() => onMarkingModeChange('question-by-question')}
                                className={`px-3 py-2 rounded-md text-sm text-left transition-colors ${
                                    markingMode === 'question-by-question' 
                                        ? 'bg-primary text-primary-foreground shadow-sm' 
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <div>
                                        <div className="font-medium">Question by Question</div>
                                        <div className="text-xs opacity-75">Mark one question across all students</div>
                                    </div>
                                </div>
                            </button>
                            <button 
                                onClick={() => onMarkingModeChange('student-by-student')}
                                className={`px-3 py-2 rounded-md text-sm text-left transition-colors ${
                                    markingMode === 'student-by-student' 
                                        ? 'bg-primary text-primary-foreground shadow-sm' 
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <div>
                                        <div className="font-medium">Student by Student</div>
                                        <div className="text-xs opacity-75">Mark all questions for each student</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Question-by-Question Mode */}
                    {markingMode === 'question-by-question' && (
                        <>
                            {loading ? (
                                <div className="text-center py-4 text-muted-foreground">Loading questions...</div>
                            ) : questions.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No questions available. Please map questions first in Mapping Mode.
                                </div>
                            ) : question ? (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full mb-4">
                                                Question {question.question_number}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="max-h-64 overflow-auto" align="end">
                                            {questions.map((q) => (
                                                <DropdownMenuItem
                                                    key={q.id}
                                                    onClick={() => onQuestionSelect(q)}
                                                    className={
                                                        q.id === question.id ? 'font-semibold bg-muted' : ''
                                                    }
                                                >
                                                    Question {q.question_number}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

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

                                    {/* Student Navigation for Question Mode */}
                                    <div className="mt-4 space-y-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-2">STUDENT NAVIGATION</div>
                                        <StudentSearchComponent />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    Select a question to view details
                                </div>
                            )}
                        </>
                    )}

                    {/* Student-by-Student Mode */}
                    {markingMode === 'student-by-student' && (
                        <>
                            {loading ? (
                                <div className="text-center py-4 text-muted-foreground">Loading students...</div>
                            ) : students.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No student answer sheets available. Please upload answer sheets first.
                                </div>
                            ) : (
                                <>
                                    {/* Student Search */}
                                    <div className="mb-4">
                                        <StudentSearchComponent />
                                    </div>

                                    {/* Student Progress Summary */}
                                    <Accordion type="single" defaultValue="progress" collapsible>
                                        <AccordionItem value="progress">
                                            <AccordionTrigger className="text-left">Progress Summary</AccordionTrigger>
                                            <AccordionContent className="p-2 text-sm space-y-2">
                                                {studentResults ? (
                                                    <div className="space-y-2">
                                                        <div className="bg-muted p-2 rounded">
                                                            <div className="font-medium text-xs text-muted-foreground">Questions Marked</div>
                                                            <div className="text-lg font-semibold">
                                                                {studentResults.questions.filter(q => q.mark !== null && q.mark !== undefined).length}/{studentResults.questions.length}
                                                            </div>
                                                        </div>
                                                        <div className="bg-muted p-2 rounded">
                                                            <div className="font-medium text-xs text-muted-foreground">Total Score</div>
                                                            <div className="text-lg font-semibold">
                                                                {studentResults.questions.reduce((sum, q) => sum + (q.mark || 0), 0)} / {studentResults.questions.reduce((sum, q) => sum + (q.max_marks || 0), 0)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground">Loading student results...</div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                        
                                        <AccordionItem value="questions">
                                            <AccordionTrigger className="text-left">Question Breakdown</AccordionTrigger>
                                            <AccordionContent className="p-2 text-sm space-y-1">
                                                {studentResults ? (
                                                    <div className="space-y-2">
                                                        {studentResults.questions.map((questionData) => (
                                                            <div key={questionData.id} className="border rounded p-2 text-xs">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-medium">Q{questionData.question_number}</span>
                                                                    <span className={`px-2 py-1 rounded ${
                                                                        questionData.mark !== null && questionData.mark !== undefined
                                                                            ? 'bg-green-100 text-green-800' 
                                                                            : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {questionData.mark ?? '—'}/{questionData.max_marks}
                                                                    </span>
                                                                </div>
                                                                <div className="text-muted-foreground mt-1">
                                                                    <div className="text-muted-foreground mt-1">
                                                    Page {questionData.page_number}
                                                    {questionData.comment && (
                                                        <div className="mt-1 text-xs truncate">
                                                            {questionData.comment}
                                                        </div>
                                                    )}
                                                </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground">Loading question details...</div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
