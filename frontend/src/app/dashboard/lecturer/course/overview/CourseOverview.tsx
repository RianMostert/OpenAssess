import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Course, Assessment } from "@/types/course";
import { useState, useEffect } from "react";

interface CourseStats {
    totalStudents: number;
    averagePerformance: number;
    assessments: AssessmentStats[];
}

interface AssessmentStats {
    id: string;
    title: string;
    published: boolean;
    totalQuestions: number;
    totalStudents: number;
    questionsMarked: number;
    questionsCompletelyMarked: number;
    averageScore: number;
    submissionCount: number;
    queryCount: number;
}

interface CourseOverviewProps {
    course: Course;
    isMobile?: boolean;
    isTablet?: boolean;
    userRole?: 'convener' | 'facilitator' | 'student'; // Add role prop
}

export default function CourseOverview({
    course,
    isMobile = false,
    isTablet = false,
    userRole = 'facilitator', // Default to facilitator
}: CourseOverviewProps) {
    const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actualUserRole, setActualUserRole] = useState<'convener' | 'facilitator' | 'student'>(userRole);

    useEffect(() => {
        fetchCourseStats();
        fetchUserRole();
    }, [course.id]);

    const fetchCourseStats = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/courses/${course.id}/stats`
            );
            
            if (response.ok) {
                const stats = await response.json();
                
                // Add dummy data for display
                // const dummyAssessments: AssessmentStats[] = [
                //     { id: 'dummy-1', title: 'Midterm Exam', published: true, totalQuestions: 8, totalStudents: 45, questionsMarked: 320, questionsCompletelyMarked: 38, averageScore: 72.5, submissionCount: 45, queryCount: 3 },
                //     { id: 'dummy-2', title: 'Assignment 1: React Basics', published: true, totalQuestions: 5, totalStudents: 42, questionsMarked: 195, questionsCompletelyMarked: 40, averageScore: 81.2, submissionCount: 42, queryCount: 1 },
                //     { id: 'dummy-3', title: 'Quiz 1', published: true, totalQuestions: 10, totalStudents: 43, questionsMarked: 430, questionsCompletelyMarked: 43, averageScore: 88.3, submissionCount: 43, queryCount: 0 },
                //     { id: 'dummy-4', title: 'Lab Report 1', published: false, totalQuestions: 4, totalStudents: 38, questionsMarked: 85, questionsCompletelyMarked: 15, averageScore: 0, submissionCount: 38, queryCount: 2 },
                //     { id: 'dummy-5', title: 'Project Proposal', published: true, totalQuestions: 6, totalStudents: 44, questionsMarked: 264, questionsCompletelyMarked: 44, averageScore: 76.8, submissionCount: 44, queryCount: 5 },
                //     { id: 'dummy-6', title: 'Quiz 2', published: true, totalQuestions: 12, totalStudents: 41, questionsMarked: 410, questionsCompletelyMarked: 35, averageScore: 79.4, submissionCount: 41, queryCount: 1 },
                //     { id: 'dummy-7', title: 'Assignment 2: State Management', published: false, totalQuestions: 7, totalStudents: 40, questionsMarked: 140, questionsCompletelyMarked: 20, averageScore: 0, submissionCount: 40, queryCount: 4 },
                //     { id: 'dummy-8', title: 'Final Exam', published: false, totalQuestions: 15, totalStudents: 12, questionsMarked: 45, questionsCompletelyMarked: 3, averageScore: 0, submissionCount: 12, queryCount: 0 },
                //     { id: 'dummy-9', title: 'Lab Report 2', published: true, totalQuestions: 5, totalStudents: 39, questionsMarked: 195, questionsCompletelyMarked: 39, averageScore: 85.6, submissionCount: 39, queryCount: 2 },
                //     { id: 'dummy-10', title: 'Assignment 3: API Integration', published: true, totalQuestions: 8, totalStudents: 37, questionsMarked: 250, questionsCompletelyMarked: 32, averageScore: 74.1, submissionCount: 37, queryCount: 6 },
                // ];
                
                setCourseStats({
                    ...stats,
                    assessments: [...(stats.assessments || [])]
                });
            } else {
                console.error('Failed to fetch course stats');
                setCourseStats({
                    totalStudents: 0,
                    averagePerformance: 0,
                    assessments: []
                });
            }
        } catch (error) {
            console.error('Error fetching course stats:', error);
            setCourseStats({
                totalStudents: 0,
                averagePerformance: 0,
                assessments: []
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchUserRole = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/${course.id}/my-role`);
            if (response.ok) {
                const roleData = await response.json();
                setActualUserRole(roleData.role === 'convener' ? 'convener' : roleData.role === 'facilitator' ? 'facilitator' : 'student');
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
            // Keep default role if fetch fails
        }
    };

    const getProgressBarColor = (percentage: number) => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const formatPercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };
    const handleStudentCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("course_id", course.id);
        formData.append("role_id", "3");

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/users/bulk-upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Upload failed");
            }

            const result = await response.json();
            console.log("Created users:", result);
            alert(`Successfully created ${result.length} users`);
            
            // Refresh stats after successful upload
            await fetchCourseStats();
        } catch (err) {
            console.error(err);
            alert(`Error uploading CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    };

    const handleStudentCSVRemove = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Confirm the action since this removes students from the course
        const confirmRemove = window.confirm(
            "Are you sure you want to remove these students from the course? This will remove their access to the course but will not delete their accounts."
        );
        
        if (!confirmRemove) {
            // Reset the file input
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("course_id", course.id);
        formData.append("role_id", "3");

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/users/bulk-remove`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Remove operation failed");
            }

            const result = await response.json();
            console.log("Remove result:", result);
            alert(result.message);
            
            // Refresh stats after successful removal
            await fetchCourseStats();
        } catch (err) {
            console.error(err);
            alert(`Error removing students: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            // Reset the file input
            e.target.value = '';
        }
    };

    const handleFacilitatorCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("role_name", "facilitator"); // Default to facilitator role

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/${course.id}/facilitators/bulk-upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Facilitator upload failed");
            }

            const result = await response.json();
            console.log("Facilitator upload result:", result);
            
            let message = result.message;
            if (result.skipped && result.skipped.length > 0) {
                message += `\nSkipped: ${result.skipped.length}`;
            }
            if (result.errors && result.errors.length > 0) {
                message += `\nErrors: ${result.errors.length}`;
                console.error("Upload errors:", result.errors);
            }
            
            alert(message);
            
            // Refresh stats after successful upload
            await fetchCourseStats();
        } catch (err) {
            console.error(err);
            alert(`Error uploading facilitators: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            // Reset the file input
            e.target.value = '';
        }
    };

    const handleFacilitatorCSVRemove = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Confirm the action since this removes facilitators from the course
        const confirmRemove = window.confirm(
            "Are you sure you want to remove these facilitators from the course? This will remove their teaching access to the course."
        );
        
        if (!confirmRemove) {
            // Reset the file input
            e.target.value = '';
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/${course.id}/facilitators/bulk-remove`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Facilitator removal failed");
            }

            const result = await response.json();
            console.log("Facilitator removal result:", result);
            
            let message = result.message;
            if (result.not_found && result.not_found.length > 0) {
                message += `\nNot found: ${result.not_found.length}`;
            }
            if (result.errors && result.errors.length > 0) {
                message += `\nErrors: ${result.errors.length}`;
                console.error("Removal errors:", result.errors);
            }
            
            alert(message);
            
            // Refresh stats after successful removal
            await fetchCourseStats();
        } catch (err) {
            console.error(err);
            alert(`Error removing facilitators: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            // Reset the file input
            e.target.value = '';
        }
    };

    return (
        <div className={`${isMobile ? 'p-4' : 'p-6'} h-full max-h-screen flex flex-col border-zinc-800 overflow-hidden font-raleway`}>
            {/* Course Header */}
            <div className="space-y-2 flex-shrink-0">
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-brand-primary-800`}>{course.title}</h1>
                {course.code && (
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} text-brand-primary-600`}>
                        Course Code: {course.code}
                    </p>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8 flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading course statistics...</span>
                </div>
            ) : (
                <div className="flex flex-col space-y-6 flex-1 min-h-0 mt-6">
                    {/* Stats Cards */}
                    <div className={`${isMobile ? 'w-full' : 'max-w-full'} flex-shrink-0`}>
                        <div className={`grid ${actualUserRole === 'convener' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                            {/* Student Management Card */}
                            <div className="bg-gradient-to-br from-brand-primary-50 to-white p-4 rounded-lg border-2 border-brand-accent-400">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-brand-primary-700">Total Students</h3>
                                    {actualUserRole === 'convener' && (
                                        <div className="flex gap-1">
                                            <label className="px-2 py-1 bg-brand-primary-600 text-white rounded text-xs hover:bg-brand-primary-700 cursor-pointer transition-colors">
                                                + Add
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={handleStudentCSVUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                            <label className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 cursor-pointer transition-colors">
                                                - Remove
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={handleStudentCSVRemove}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <p className="text-2xl font-bold text-brand-primary-700">{courseStats?.totalStudents || 0}</p>
                                <p className="text-xs text-brand-primary-600 mt-1">
                                    {actualUserRole === 'convener' ? 'Upload CSV to add or remove students' : 'Enrolled students in this course'}
                                </p>
                            </div>

                            {/* Facilitator Management Card - Only visible to conveners */}
                            {actualUserRole === 'convener' && (
                                <div className="bg-gradient-to-br from-brand-accent-50 to-white p-4 rounded-lg border-2 border-brand-accent-400">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-brand-primary-700">Manage Facilitators</h3>
                                        <div className="flex gap-1">
                                            <label className="px-2 py-1 bg-brand-primary-600 text-white rounded text-xs hover:bg-brand-primary-700 cursor-pointer transition-colors">
                                                + Add
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={handleFacilitatorCSVUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                            <label className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 cursor-pointer transition-colors">
                                                - Remove
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={handleFacilitatorCSVRemove}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-brand-accent-700">Staff & Facilitators</p>
                                    <p className="text-xs text-brand-primary-600 mt-1">
                                        Upload CSV with email, first_name, last_name to manage course facilitators
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assessment Progress Table */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col flex-1 min-h-0"
                        style={{
                            maxHeight: isMobile
                                ? 'calc(100vh - 360px)'
                                : isTablet
                                ? 'calc(100vh - 310px)'
                                : 'calc(100vh - 305px)'
                        }}
                    >
                        <div className="px-6 py-5 bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Assessment Progress</h2>
                                <span className="text-sm text-brand-primary-100">
                                    {courseStats?.assessments.length || 0} assessments
                                </span>
                            </div>
                        </div>
                        
                        {courseStats?.assessments && courseStats.assessments.length > 0 ? (
                            <div className="flex-1 overflow-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Assessment</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Questions Marked</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Submissions Marked</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Average Grade</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Queries</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {courseStats.assessments.map((assessment) => {
                                            // Questions marked percentage - based on submissions only
                                            const questionsMarkedPercentage = formatPercentage(
                                                assessment.questionsMarked,
                                                assessment.totalQuestions * assessment.totalStudents  // totalStudents now represents submission count
                                            );
                                            
                                            // Students marked: backend now returns the actual count
                                            const studentsMarked = assessment.questionsCompletelyMarked;
                                            const studentsMarkedPercentage = assessment.totalStudents > 0 
                                                ? formatPercentage(studentsMarked, assessment.totalStudents)
                                                : 0;

                                            return (
                                                <tr key={assessment.id} className="hover:bg-brand-primary-50 transition-colors duration-150">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{assessment.title}</p>
                                                            <p className="text-sm text-brand-accent-700 font-medium">
                                                                {assessment.totalQuestions} questions • {assessment.totalStudents} submissions
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                                            assessment.published 
                                                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                        }`}>
                                                            {assessment.published ? 'Published' : 'Unpublished'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-brand-primary-700 font-semibold">{assessment.questionsMarked}/{assessment.totalQuestions * assessment.totalStudents}</span>
                                                                <span className="text-brand-primary-600">{questionsMarkedPercentage}%</span>
                                                            </div>
                                                            <div className="w-full bg-brand-accent-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${getProgressBarColor(questionsMarkedPercentage)}`}
                                                                    style={{ width: `${questionsMarkedPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-brand-primary-700 font-semibold">{studentsMarked}/{assessment.totalStudents}</span>
                                                                <span className="text-brand-primary-600">{studentsMarkedPercentage}%</span>
                                                            </div>
                                                            <div className="w-full bg-brand-accent-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${getProgressBarColor(studentsMarkedPercentage)}`}
                                                                    style={{ width: `${studentsMarkedPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-semibold text-brand-primary-700">
                                                            {assessment.averageScore > 0 ? `${assessment.averageScore.toFixed(1)}%` : 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm font-semibold text-brand-primary-700">
                                                                {assessment.queryCount || 0}
                                                            </span>
                                                            {assessment.queryCount > 0 && (
                                                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-semibold">
                                                                    needs review
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-brand-primary-300 mb-4">
                                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Assessments Found</h3>
                                <p className="text-gray-600">Create an assessment to see progress statistics.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
