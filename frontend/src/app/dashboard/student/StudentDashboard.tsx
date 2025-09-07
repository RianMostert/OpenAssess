'use client';

import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

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
    status: 'not_submitted' | 'submitted_pending' | 'graded' | 'partially_graded';
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

export default function StudentDashboard({ 
    isMobile = false, 
    isTablet = false 
}: StudentDashboardProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [assessments, setAssessments] = useState<AssessmentWithCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [assessmentsLoading, setAssessmentsLoading] = useState(false);

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
                className: 'bg-red-100 text-red-800' 
            },
            submitted_pending: { 
                label: 'Pending Review', 
                className: 'bg-yellow-100 text-yellow-800' 
            },
            partially_graded: { 
                label: 'Partially Graded', 
                className: 'bg-blue-100 text-blue-800' 
            },
            graded: { 
                label: 'Graded', 
                className: 'bg-green-100 text-green-800' 
            }
        };

        const config = statusConfig[status];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
            </span>
        );
    };

    const handleQueryMark = (assessmentId: string) => {
        // Placeholder for future functionality
        alert(`Query mark functionality coming soon for assessment: ${assessmentId}`);
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
            <div className="flex-1 bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Student Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Welcome back! Here are your assessments and grades.
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Total Courses
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                            {courses.length}
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Total Assessments
                        </h3>
                        <p className="text-3xl font-bold text-indigo-600">
                            {assessments.length}
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Pending Grades
                        </h3>
                        <p className="text-3xl font-bold text-yellow-600">
                            {assessments.filter(a => a.status === 'submitted_pending' || a.status === 'partially_graded').length}
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Completed
                        </h3>
                        <p className="text-3xl font-bold text-green-600">
                            {assessments.filter(a => a.status === 'graded').length}
                        </p>
                    </div>
                </div>

                {/* Assessments Table */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            My Assessments
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                            All your assessments across all courses
                        </p>
                    </div>
                    
                    {assessmentsLoading ? (
                        <div className="p-6">
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ) : assessments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Assessments Found
                            </h3>
                            <p className="text-gray-600">
                                No assessments available in your enrolled courses yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Course
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Assessment
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Submitted
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mark
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {assessments.map((assessment) => (
                                        <tr key={assessment.assessment_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {assessment.course_title}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
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
                                                <div className="text-sm text-gray-900">
                                                    {assessment.status === 'not_submitted' ? (
                                                        <span className="text-gray-400">Not submitted</span>
                                                    ) : (
                                                        <span className="text-green-600">✓ Submitted</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(assessment.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {assessment.total_marks !== null ? (
                                                        <div>
                                                            <span className="font-medium">
                                                                {assessment.total_marks}/{assessment.total_possible_marks}
                                                            </span>
                                                            {assessment.percentage !== null && (
                                                                <span className="text-gray-500 ml-2">
                                                                    ({assessment.percentage}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => handleQueryMark(assessment.assessment_id)}
                                                    className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                                    title="Query this mark"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Query</span>
                                                </button>
                                                {assessment.has_annotated_pdf && (
                                                    <button
                                                        onClick={() => handleDownloadPdf(assessment.assessment_id)}
                                                        className="text-purple-600 hover:text-purple-900 flex items-center space-x-1"
                                                        title="Download annotated PDF"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span>PDF</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
