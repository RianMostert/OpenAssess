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