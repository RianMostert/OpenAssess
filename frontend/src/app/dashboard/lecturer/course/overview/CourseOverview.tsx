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
                setCourseStats(stats);
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
        <div className={`${isMobile ? 'p-4' : 'p-6'} h-full max-h-screen flex flex-col border-zinc-800 overflow-hidden`}>
            {/* Course Header */}
            <div className="space-y-2 flex-shrink-0">
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>{course.title}</h1>
                {course.code && (
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
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
                            <div className="bg-card p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Total Students</h3>
                                    {actualUserRole === 'convener' && (
                                        <div className="flex gap-1">
                                            <label className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 cursor-pointer transition-colors">
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
                                <p className="text-2xl font-bold text-blue-600">{courseStats?.totalStudents || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {actualUserRole === 'convener' ? 'Upload CSV to add or remove students' : 'Enrolled students in this course'}
                                </p>
                            </div>

                            {/* Facilitator Management Card - Only visible to conveners */}
                            {actualUserRole === 'convener' && (
                                <div className="bg-card p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-muted-foreground">Manage Facilitators</h3>
                                        <div className="flex gap-1">
                                            <label className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 cursor-pointer transition-colors">
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
                                    <p className="text-2xl font-bold text-green-600">Staff & Facilitators</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Upload CSV with email, first_name, last_name to manage course facilitators
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assessment Progress Table */}
                    <div className="bg-card rounded-lg border flex flex-col flex-1 min-h-0 max-h-96">
                        <div className="p-4 border-b flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Assessment Progress</h2>
                                <span className="text-sm text-muted-foreground">
                                    {courseStats?.assessments.length || 0} assessments
                                </span>
                            </div>
                        </div>
                        
                        {courseStats?.assessments && courseStats.assessments.length > 0 ? (
                            <div className="flex-1 overflow-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="border-b">
                                            <th className="text-left p-3 font-medium">Assessment</th>
                                            <th className="text-left p-3 font-medium">Status</th>
                                            <th className="text-left p-3 font-medium">Questions Marked</th>
                                            <th className="text-left p-3 font-medium">Submissions Marked</th>
                                            <th className="text-left p-3 font-medium">Average Grade</th>
                                            <th className="text-left p-3 font-medium">Queries</th>
                                        </tr>
                                    </thead>
                                    <tbody>
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
                                                <tr key={assessment.id} className="border-b hover:bg-muted/30">
                                                    <td className="p-3">
                                                        <div>
                                                            <p className="font-medium">{assessment.title}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {assessment.totalQuestions} questions • {assessment.totalStudents} submissions
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            assessment.published 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {assessment.published ? 'Published' : 'Unpublished'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span>{assessment.questionsMarked}/{assessment.totalQuestions * assessment.totalStudents}</span>
                                                                <span className="text-muted-foreground">{questionsMarkedPercentage}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${getProgressBarColor(questionsMarkedPercentage)}`}
                                                                    style={{ width: `${questionsMarkedPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span>{studentsMarked}/{assessment.totalStudents}</span>
                                                                <span className="text-muted-foreground">{studentsMarkedPercentage}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${getProgressBarColor(studentsMarkedPercentage)}`}
                                                                    style={{ width: `${studentsMarkedPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-medium">
                                                            {assessment.averageScore > 0 ? `${assessment.averageScore.toFixed(1)}%` : 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-medium">
                                                                {assessment.queryCount || 0}
                                                            </span>
                                                            {assessment.queryCount > 0 && (
                                                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
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
                            <div className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
                                <div>
                                    <p>No assessments found for this course.</p>
                                    <p className="text-sm mt-2">Create an assessment to see progress statistics.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
