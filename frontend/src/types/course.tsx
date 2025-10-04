export interface Course {
    id: string;
    title: string;
    code?: string;
    teacher_id: string;
}

export interface Assessment {
    id: string;
    title: string;
    published: boolean;
}

export interface Question {
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

// New types for grading modes
export type GradingMode = 'question-by-question' | 'student-by-student';

export interface QuestionWithResult {
    id: string;
    question_number: string;
    max_marks?: number;
    increment?: number;
    memo?: string;
    marking_note?: string;
    page_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
    mark?: number;
    comment?: string;
    annotation?: any;
    result_id?: string;
    updated_at?: string;
}

export interface StudentAllResults {
    student_id: string;
    assessment_id: string;
    questions: QuestionWithResult[];
}

export interface UploadedAnswer {
    id: string;
    student_id: string;
    student_number?: string;
    student_name?: string;
    answer_sheet_file_path: string;
}