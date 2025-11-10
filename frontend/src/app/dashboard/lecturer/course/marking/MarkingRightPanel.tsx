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
import { MoreVertical, ChevronLeft, ChevronRight, User, Users, Search, Eye, EyeOff } from 'lucide-react';
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
    
    // Accordion state to prevent unnecessary re-renders
    const [accordionValue, setAccordionValue] = useState<string>('question');
    const [studentAccordionValue, setStudentAccordionValue] = useState<string>('progress');
    
    // Use shared student results when available, fallback to local state
    const studentResults = markingMode === 'student-by-student' ? propStudentResults : null;
    
    // Use prop-based student index, fallback to local state for backward compatibility
    const currentStudentIndex = propCurrentStudentIndex ?? 0;
    const setCurrentStudentIndex = onStudentIndexChange ?? (() => {});
    
    // Student search functionality
    const [studentSearch, setStudentSearch] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<UploadedAnswer[]>([]);
    const [searchFocused, setSearchFocused] = useState(false);
    
    // Anonymous marking mode
    const [anonymousMode, setAnonymousMode] = useState(false);

    // Student search UI is rendered inline to avoid remounting that causes input to lose focus

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
            className={`flex flex-col transition-all duration-300 ease-in-out border-l-2 border-brand-accent-400 h-full bg-white font-raleway`}
            style={{
                width: collapsed ? '40px' : `${width}px`,
                minWidth: collapsed ? '40px' : `${width}px`,
            }}
        >
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b-2 border-brand-accent-200 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 flex-shrink-0">
                {!collapsed && (
                    <h2 className="text-xl font-bold text-brand-primary-800 flex items-center gap-2">
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
                    className="text-brand-primary-600 hover:text-brand-primary-800 hover:bg-brand-primary-100"
                >
                    {collapsed ? <ChevronLeft /> : <ChevronRight />}
                </Button>
            </div>

            {!collapsed && (
                <div className="flex-1 overflow-y-auto px-2 min-h-0">
                    {/* Marking Mode Selection */}
                    <div className="mb-4">
                        <div className="text-xs font-bold text-brand-primary-700 mb-2 uppercase tracking-wider">Marking Mode</div>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => onMarkingModeChange('question-by-question')}
                                className={`px-3 py-2.5 rounded-lg text-sm text-left transition-all border-2 ${
                                    markingMode === 'question-by-question' 
                                        ? 'bg-brand-primary-600 text-white border-brand-primary-700 shadow-md' 
                                        : 'bg-white text-brand-primary-700 border-brand-accent-400 hover:border-brand-primary-500 hover:bg-brand-primary-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <div>
                                        <div className="font-semibold">Question by Question</div>
                                        <div className={`text-xs ${markingMode === 'question-by-question' ? 'opacity-90' : 'opacity-70'}`}>
                                            Mark one question across all students
                                        </div>
                                    </div>
                                </div>
                            </button>
                            <button 
                                onClick={() => onMarkingModeChange('student-by-student')}
                                className={`px-3 py-2.5 rounded-lg text-sm text-left transition-all border-2 ${
                                    markingMode === 'student-by-student' 
                                        ? 'bg-brand-primary-600 text-white border-brand-primary-700 shadow-md' 
                                        : 'bg-white text-brand-primary-700 border-brand-accent-400 hover:border-brand-primary-500 hover:bg-brand-primary-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <div>
                                        <div className="font-semibold">Student by Student</div>
                                        <div className={`text-xs ${markingMode === 'student-by-student' ? 'opacity-90' : 'opacity-70'}`}>
                                            Mark all questions for each student
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Student Search - Common for both modes */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-brand-primary-700 uppercase tracking-wider">Student Navigation</div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAnonymousMode(!anonymousMode)}
                                className="h-7 px-2 text-xs"
                                title={anonymousMode ? "Show student names" : "Hide student names (anonymous marking)"}
                            >
                                {anonymousMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-primary-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search by student number..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                    className="pl-10 border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                                    autoComplete="off"
                                />
                            </div>

                            {/* Search Results */}
                            {searchFocused && studentSearch.trim() !== '' && (
                                <div className="bg-white border-2 border-brand-accent-400 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => (
                                            <button
                                                key={student.id}
                                                onClick={() => handleStudentSelect(student)}
                                                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                                                className="w-full text-left px-3 py-2 hover:bg-brand-primary-50 text-sm border-b-2 border-brand-accent-200 last:border-b-0 transition-colors"
                                            >
                                                <div className="font-semibold text-brand-primary-800">
                                                    {anonymousMode ? `Student ${students.findIndex(s => s.id === student.id) + 1}` : (student.student_number || student.student_id)}
                                                </div>
                                                {!anonymousMode && student.student_name && (
                                                    <div className="text-xs text-brand-primary-600">{student.student_name}</div>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-sm text-brand-primary-600">
                                            No students found
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Current Student Display */}
                            <div className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 p-3 rounded-lg border-2 border-brand-accent-400">
                                <div className="text-xs font-bold text-brand-primary-700 mb-1 uppercase tracking-wider">Current Student</div>
                                <div className="font-bold text-brand-primary-800">
                                    {anonymousMode 
                                        ? `Student ${currentStudentIndex + 1}`
                                        : (students[currentStudentIndex]?.student_number || students[currentStudentIndex]?.student_id || `Student ${currentStudentIndex + 1}`)
                                    }
                                </div>
                                {!anonymousMode && students[currentStudentIndex]?.student_name && (
                                    <div className="text-sm text-brand-primary-600 font-medium">{students[currentStudentIndex].student_name}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Question-by-Question Mode */}
                    {markingMode === 'question-by-question' && (
                        <>
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
                                        No questions available. Please map questions first in Mapping Mode.
                                    </p>
                                </div>
                            ) : question ? (
                                <>
                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-brand-primary-700 mb-2 uppercase tracking-wider">Question</div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    className="w-full border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 hover:border-brand-primary-500 font-semibold"
                                                >
                                                    Question {question.question_number}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="max-h-64 overflow-auto border-2 border-brand-accent-400 bg-white shadow-lg" align="end">
                                                {questions.map((q) => (
                                                    <DropdownMenuItem
                                                        key={q.id}
                                                        onClick={() => onQuestionSelect(q)}
                                                        className={`cursor-pointer font-medium ${
                                                            q.id === question.id 
                                                                ? 'bg-brand-primary-100 text-brand-primary-800' 
                                                                : 'text-brand-primary-700 hover:bg-brand-primary-50'
                                                        }`}
                                                    >
                                                        Question {q.question_number}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <Accordion type="single" value={accordionValue} onValueChange={setAccordionValue} collapsible>
                                        <AccordionItem value="question" className="border-b-2 border-brand-accent-200">
                                            <AccordionTrigger className="text-left font-semibold text-brand-primary-700 hover:text-brand-primary-900 hover:no-underline">
                                                Details
                                            </AccordionTrigger>
                                            <AccordionContent className="p-3 text-sm space-y-2 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 rounded-lg border-2 border-brand-accent-200 mt-2">
                                                <p className="text-brand-primary-800"><strong className="text-brand-primary-900">{question.question_number}</strong></p>
                                                <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Max Marks:</strong> {question.max_marks ?? '—'}</p>
                                                <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Increment:</strong> {question.increment ?? '—'}</p>
                                                <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Memo:</strong> {question.memo ?? '—'}</p>
                                                {/* <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Marking Note:</strong> {question.marking_note ?? '—'}</p>
                                                <p className="text-brand-primary-800"><strong className="text-brand-primary-900">Page:</strong> {question.page_number}</p> */}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </>
                            ) : (
                                <div className="text-center py-4 text-brand-primary-600 font-medium text-sm">
                                    Select a question to view details
                                </div>
                            )}
                        </>
                    )}

                    {/* Student-by-Student Mode */}
                    {markingMode === 'student-by-student' && (
                        <>
                            {loading ? (
                                <div className="text-center py-4 text-brand-primary-600 font-medium">Loading students...</div>
                            ) : students.length === 0 ? (
                                <div className="text-center py-6">
                                    <svg
                                        className="mx-auto h-12 w-12 text-brand-accent-400 mb-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                        />
                                    </svg>
                                    <p className="text-brand-primary-700 font-semibold text-sm mb-1">No Students Available</p>
                                    <p className="text-brand-primary-600 text-xs">Please upload answer sheets first.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Student Progress Summary */}
                                    <Accordion type="single" value={studentAccordionValue} onValueChange={setStudentAccordionValue} collapsible>
                                        <AccordionItem value="progress" className="border-b-2 border-brand-accent-200">
                                            <AccordionTrigger className="text-left font-semibold text-brand-primary-700 hover:text-brand-primary-900 hover:no-underline">
                                                Progress Summary
                                            </AccordionTrigger>
                                            <AccordionContent className="p-3 text-sm space-y-2">
                                                {studentResults ? (
                                                    <div className="space-y-2">
                                                        <div className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 p-3 rounded-lg border-2 border-brand-accent-400">
                                                            <div className="font-bold text-xs text-brand-primary-700 uppercase tracking-wider mb-1">Questions Marked</div>
                                                            <div className="text-2xl font-bold text-brand-primary-800">
                                                                {studentResults.questions.filter(q => q.mark !== null && q.mark !== undefined).length}/{studentResults.questions.length}
                                                            </div>
                                                        </div>
                                                        <div className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 p-3 rounded-lg border-2 border-brand-accent-400">
                                                            <div className="font-bold text-xs text-brand-primary-700 uppercase tracking-wider mb-1">Total Score</div>
                                                            <div className="text-2xl font-bold text-brand-primary-800">
                                                                {studentResults.questions.reduce((sum, q) => sum + (q.mark || 0), 0)} / {studentResults.questions.reduce((sum, q) => sum + (q.max_marks || 0), 0)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-brand-primary-600 font-medium">Loading student results...</div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                        
                                        <AccordionItem value="questions" className="border-b-2 border-brand-accent-200">
                                            <AccordionTrigger className="text-left font-semibold text-brand-primary-700 hover:text-brand-primary-900 hover:no-underline">
                                                Question Breakdown
                                            </AccordionTrigger>
                                            <AccordionContent className="p-3 text-sm space-y-2">
                                                {studentResults ? (
                                                    <div className="space-y-2">
                                                        {studentResults.questions.map((questionData) => (
                                                            <div key={questionData.id} className="border-2 border-brand-accent-400 rounded-lg p-3 text-xs bg-white hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="font-bold text-brand-primary-800">Q{questionData.question_number}</span>
                                                                    <span className={`px-2.5 py-1 rounded-lg font-semibold ${
                                                                        questionData.mark !== null && questionData.mark !== undefined
                                                                            ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                                                                            : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                                                                    }`}>
                                                                        {questionData.mark ?? '—'}/{questionData.max_marks}
                                                                    </span>
                                                                </div>
                                                                <div className="text-brand-primary-600 font-medium">
                                                                    Page {questionData.page_number}
                                                                </div>
                                                                {questionData.comment && (
                                                                    <div className="mt-2 text-xs text-brand-primary-700 bg-brand-primary-50 p-2 rounded-lg border border-brand-accent-300">
                                                                        <strong className="text-brand-primary-900">Comment:</strong> {questionData.comment}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-brand-primary-600 font-medium">Loading questions...</div>
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
