'use client';

import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import QueryModal from './components/QueryModal';
import QueryHistoryModal from './components/QueryHistoryModal';

interface StudentDashboardProps {
    isMobile?: boolean;
    isTablet?: boolean;
}

interface UserInfo {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    primary_role_id?: number;
}

interface Course {
    id: string;
    title: string;
    code: string;
    teacher_name: string;
    my_role: string;
    created_at: string;
}

interface Assessment {
    assessment_id: string;
    title: string;
    upload_date: string;
    status: 'not_submitted' | 'submitted_pending' | 'marked' | 'partially_marked';
    total_marks: number | null;
    total_possible_marks: number;
    percentage: number | null;
    uploaded_file_id: string | null;
    question_count: number;
    has_annotated_pdf: boolean;
}

interface AssessmentWithCourse extends Assessment {
    course_title: string;
    course_code: string;
}

interface QueryGroup {
    id: string;
    batch_id?: string;
    assessment_id: string;
    assessment_title: string;
    question_count: number;
    query_types: string[];
    combined_requests: string;
    created_at: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
    query_ids: string[];
    is_batch: boolean;
    question_number?: string;
}

export default function StudentDashboard({ 
    isMobile = false, 
    isTablet = false 
}: StudentDashboardProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [assessments, setAssessments] = useState<AssessmentWithCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [assessmentsLoading, setAssessmentsLoading] = useState(false);
    
    // Query-related state
    const [queries, setQueries] = useState<QueryGroup[]>([]);
    const [queryModalOpen, setQueryModalOpen] = useState(false);
    const [queryHistoryModalOpen, setQueryHistoryModalOpen] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentWithCourse | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decoded: UserInfo = jwtDecode(token);
                setUserInfo(decoded);
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }

        // Fetch student courses and assessments
        fetchStudentData();
    }, []);

    const fetchStudentData = async () => {
        try {
            await fetchStudentCourses();
            await fetchStudentQueries();
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentCourses = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/student-results/my-courses`);

            if (response.ok) {
                const coursesData = await response.json();
                setCourses(coursesData);
                
                // Fetch assessments for all courses
                await fetchAllAssessments(coursesData);
            } else {
                console.error('Failed to fetch courses');
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchAllAssessments = async (coursesData: Course[]) => {
        setAssessmentsLoading(true);
        try {
            const allAssessments: AssessmentWithCourse[] = [];
            
            for (const course of coursesData) {
                try {
                    const response = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_URL}/student-results/courses/${course.id}/my-assessments`
                    );
                    
                    if (response.ok) {
                        const courseAssessments: Assessment[] = await response.json();
                        const assessmentsWithCourse = courseAssessments.map(assessment => ({
                            ...assessment,
                            course_title: course.title,
                            course_code: course.code
                        }));
                        allAssessments.push(...assessmentsWithCourse);
                    }
                } catch (error) {
                    console.error(`Error fetching assessments for course ${course.title}:`, error);
                }
            }

            // Add dummy data for display purposes
            const dummyAssessments: AssessmentWithCourse[] = [
                { assessment_id: 'dummy-1', title: 'Assignment 1: Introduction to React', upload_date: '2024-09-15', status: 'marked', total_marks: 85, total_possible_marks: 100, percentage: 85, uploaded_file_id: 'file-1', question_count: 5, has_annotated_pdf: true, course_title: 'Web Development', course_code: 'CS301' },
                { assessment_id: 'dummy-2', title: 'Midterm Exam', upload_date: '2024-10-01', status: 'marked', total_marks: 78, total_possible_marks: 100, percentage: 78, uploaded_file_id: 'file-2', question_count: 8, has_annotated_pdf: true, course_title: 'Data Structures', course_code: 'CS202' },
                { assessment_id: 'dummy-3', title: 'Lab Report 3', upload_date: '2024-10-10', status: 'partially_marked', total_marks: 42, total_possible_marks: 50, percentage: 84, uploaded_file_id: 'file-3', question_count: 4, has_annotated_pdf: false, course_title: 'Database Systems', course_code: 'CS305' },
                { assessment_id: 'dummy-4', title: 'Project Proposal', upload_date: '2024-10-15', status: 'submitted_pending', total_marks: null, total_possible_marks: 50, percentage: null, uploaded_file_id: 'file-4', question_count: 3, has_annotated_pdf: false, course_title: 'Software Engineering', course_code: 'CS401' },
                { assessment_id: 'dummy-5', title: 'Quiz 2', upload_date: '2024-10-20', status: 'marked', total_marks: 18, total_possible_marks: 20, percentage: 90, uploaded_file_id: 'file-5', question_count: 10, has_annotated_pdf: true, course_title: 'Algorithms', course_code: 'CS303' },
                { assessment_id: 'dummy-6', title: 'Assignment 2: State Management', upload_date: '2024-10-25', status: 'marked', total_marks: 92, total_possible_marks: 100, percentage: 92, uploaded_file_id: 'file-6', question_count: 6, has_annotated_pdf: true, course_title: 'Web Development', course_code: 'CS301' },
                { assessment_id: 'dummy-7', title: 'Final Project Draft', upload_date: '2024-10-28', status: 'not_submitted', total_marks: null, total_possible_marks: 100, percentage: null, uploaded_file_id: null, question_count: 0, has_annotated_pdf: false, course_title: 'Mobile Development', course_code: 'CS404' },
                { assessment_id: 'dummy-8', title: 'Lab 5: SQL Queries', upload_date: '2024-10-30', status: 'marked', total_marks: 45, total_possible_marks: 50, percentage: 90, uploaded_file_id: 'file-8', question_count: 5, has_annotated_pdf: true, course_title: 'Database Systems', course_code: 'CS305' },
                { assessment_id: 'dummy-9', title: 'Case Study Analysis', upload_date: '2024-11-01', status: 'submitted_pending', total_marks: null, total_possible_marks: 75, percentage: null, uploaded_file_id: 'file-9', question_count: 4, has_annotated_pdf: false, course_title: 'Software Engineering', course_code: 'CS401' },
                { assessment_id: 'dummy-10', title: 'Homework 4', upload_date: '2024-11-03', status: 'marked', total_marks: 28, total_possible_marks: 30, percentage: 93.33, uploaded_file_id: 'file-10', question_count: 6, has_annotated_pdf: true, course_title: 'Algorithms', course_code: 'CS303' },
            ];
            
            allAssessments.push(...dummyAssessments);
            
            setAssessments(allAssessments);
        } catch (error) {
            console.error('Error fetching assessments:', error);
        } finally {
            setAssessmentsLoading(false);
        }
    };

    const getStatusBadge = (status: Assessment['status']) => {
        const statusConfig = {
            not_submitted: { 
                label: 'Not Submitted', 
                className: 'bg-red-100 text-red-800 border border-red-200' 
            },
            submitted_pending: { 
                label: 'Pending Review', 
                className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
            },
            partially_marked: { 
                label: 'Partially Marked', 
                className: 'bg-brand-accent-100 text-brand-accent-800 border border-brand-accent-200' 
            },
            marked: { 
                label: 'Marked', 
                className: 'bg-green-100 text-green-800 border border-green-200' 
            }
        };

        const config = statusConfig[status] || { 
            label: 'Unknown', 
            className: 'bg-gray-100 text-gray-800 border border-gray-200' 
        };
        
        return (
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${config.className}`}>
                {config.label}
            </span>
        );
    };

    const fetchStudentQueries = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/student-queries/my-queries-grouped`);
            if (response.ok) {
                const queriesData = await response.json();
                setQueries(queriesData);
            } else {
                console.error('Failed to fetch queries, status:', response.status);
                console.error('Response text:', await response.text());
            }
        } catch (error) {
            console.error('Error fetching queries:', error);
        }
    };

    const handleQueryMark = (assessmentId: string) => {
        const assessment = assessments.find(a => a.assessment_id === assessmentId);
        if (assessment) {
            setSelectedAssessment(assessment);
            setQueryModalOpen(true);
        }
    };

    const handleViewQueryHistory = (assessmentId: string) => {
        const assessment = assessments.find(a => a.assessment_id === assessmentId);
        if (assessment) {
            setSelectedAssessment(assessment);
            setQueryHistoryModalOpen(true);
        }
    };

    const handleQuerySubmitted = () => {
        // Refresh queries after submission
        fetchStudentQueries();
    };

    const getQueryStatusBadge = (status: QueryGroup['status']) => {
        const statusConfig = {
            pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
            under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
            resolved: { label: 'Resolved', className: 'bg-gray-100 text-gray-800' }
        };

        const config = statusConfig[status] || { 
            label: 'Unknown', 
            className: 'bg-gray-100 text-gray-800' 
        };
        
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
            </span>
        );
    };

    const hasActiveQuery = (assessmentId: string) => {
        return queries.some(q => 
            q.assessment_id === assessmentId && 
            ['pending', 'under_review'].includes(q.status)
        );
    };

    const getQueryForAssessment = (assessmentId: string) => {
        return queries.find(q => q.assessment_id === assessmentId);
    };

    const handleDownloadPdf = async (assessmentId: string) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/student-results/assessments/${assessmentId}/download-annotated-pdf`
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail || 'Failed to download PDF';
                alert(`Error: ${errorMessage}`);
                return;
            }

            // Get filename from response headers or use default
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'annotated_assessment.pdf';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 bg-gradient-to-br from-gray-50 to-brand-primary-50 p-6 font-raleway">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-10 bg-gradient-to-r from-brand-primary-200 to-brand-accent-200 rounded-lg w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-gradient-to-br from-brand-primary-100 to-brand-accent-100 rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway overflow-hidden flex flex-col">
            <div className="max-w-7xl mx-auto p-6 w-full flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="mb-6 flex-shrink-0">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-primary-700 bg-clip-text text-transparent mb-2">
                        Student Dashboard
                    </h1>
                    <p className="text-gray-700 text-lg">
                        Welcome back! Here are your assessments and marks.
                    </p>
                </div>

                {/* Assessments Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-5 bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-white">
                            My Assessments
                        </h2>
                        <p className="text-brand-primary-100 text-sm mt-1">
                            All your assessments across all courses
                        </p>
                    </div>
                    
                    {assessmentsLoading ? (
                        <div className="p-6">
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-gradient-to-r from-brand-primary-100 to-brand-accent-100 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ) : assessments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-brand-primary-300 mb-4">
                                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                No Assessments Found
                            </h3>
                            <p className="text-gray-600">
                                No assessments available in your enrolled courses yet.
                            </p>
                        </div>
                    ) : (
                        <div
                            className="overflow-auto flex-1"
                            style={{
                                // Keep table contained and stop before the bottom of the viewport.
                                // Adjust values per device so the table never flows off screen.
                                maxHeight: isMobile
                                    ? 'calc(100vh - 360px)' // mobile: leave extra space for header/nav
                                    : isTablet
                                    ? 'calc(100vh - 310px)' // tablet: slightly less reserved
                                    : 'calc(100vh - 305px)' // desktop: reserve header + padding
                            }}
                        >
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">
                                            Course
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">
                                            Assessment
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">
                                            Mark
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {assessments.map((assessment) => (
                                        <tr key={assessment.assessment_id} className="hover:bg-brand-primary-50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {assessment.course_title}
                                                    </div>
                                                    <div className="text-sm text-brand-accent-700 font-medium">
                                                        {assessment.course_code}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {assessment.title}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(assessment.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {assessment.total_marks !== null ? (
                                                        <div>
                                                            <span className="font-bold text-brand-primary">
                                                                {assessment.total_marks}/{assessment.total_possible_marks}
                                                            </span>
                                                            {assessment.percentage !== null && (
                                                                <span className="text-brand-accent-700 ml-2 font-semibold">
                                                                    ({assessment.percentage}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex flex-col space-y-2">
                                                    <div className="flex space-x-2 items-center">
                                                        <button
                                                            onClick={() => hasActiveQuery(assessment.assessment_id) 
                                                                ? handleViewQueryHistory(assessment.assessment_id)
                                                                : handleQueryMark(assessment.assessment_id)
                                                            }
                                                            className="flex items-center space-x-1 text-brand-primary hover:text-brand-primary-700 font-medium transition-colors duration-150"
                                                            title={hasActiveQuery(assessment.assessment_id) ? "View queries" : "Create new query"}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Query</span>
                                                        </button>
                                                        {assessment.has_annotated_pdf && (
                                                            <button
                                                                onClick={() => handleDownloadPdf(assessment.assessment_id)}
                                                                className="text-brand-accent-700 hover:text-brand-accent-800 flex items-center space-x-1 font-medium transition-colors duration-150"
                                                                title="Download annotated PDF"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <span>PDF</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Query Modal */}
                {selectedAssessment && (
                    <QueryModal
                        isOpen={queryModalOpen}
                        onClose={() => {
                            setQueryModalOpen(false);
                            setSelectedAssessment(null);
                        }}
                        assessmentId={selectedAssessment.assessment_id}
                        assessmentTitle={selectedAssessment.title}
                        onQuerySubmitted={handleQuerySubmitted}
                    />
                )}

                {/* Query History Modal */}
                {selectedAssessment && (
                    <QueryHistoryModal
                        isOpen={queryHistoryModalOpen}
                        onClose={() => {
                            setQueryHistoryModalOpen(false);
                            setSelectedAssessment(null);
                        }}
                        assessmentId={selectedAssessment.assessment_id}
                        assessmentTitle={selectedAssessment.title}
                        onCreateNewQuery={() => {
                            // Keep the selected assessment and switch modals
                            setQueryHistoryModalOpen(false);
                            // Small delay to ensure the history modal closes before opening the query modal
                            setTimeout(() => {
                                setQueryModalOpen(true);
                            }, 100);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
