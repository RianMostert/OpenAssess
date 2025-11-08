import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Assessment, Course } from "@/types/course";
import { useState, useEffect } from "react";
import QueryManagement from "@/app/dashboard/lecturer/course/components/QueryManagement";
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AssessmentStats {
    grading_completion: {
        total_submissions: number;
        graded_submissions: number;
        ungraded_submissions: number;
        completion_percentage: number;
    };
    grade_distribution: {
        average_score: number;
        median_score: number;
        highest_score: number;
        lowest_score: number;
        score_ranges: Array<{
            range: string;
            count: number;
        }>;
    };
    question_performance: Array<{
        question_number: number;
        question_title: string;
        max_marks: number;
        graded_count: number;
        ungraded_count: number;
        average_mark: number;
        average_percentage: number;
        highest_mark: number;
        lowest_mark: number;
    }>;
}

interface AssessmentOverviewProps {
    course: Course;
    assessment: Assessment;
    setActiveMode: (mode: 'view' | 'map' | 'mark') => void;
    onAssessmentUpdate?: (updatedAssessment: Assessment) => void;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function AssessmentOverview({
    course,
    assessment,
    setActiveMode,
    onAssessmentUpdate,
    isMobile = false,
    isTablet = false,
}: AssessmentOverviewProps) {
    const [isUpdatingPublishStatus, setIsUpdatingPublishStatus] = useState(false);
    const [assessmentStats, setAssessmentStats] = useState<AssessmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isQuestionsExpanded, setIsQuestionsExpanded] = useState(true);
    const [isQueriesExpanded, setIsQueriesExpanded] = useState(true);
    const [queryFilterStatus, setQueryFilterStatus] = useState<string>('pending');
    const [queryCount, setQueryCount] = useState<number>(0);

    useEffect(() => {
        fetchAssessmentStats();
    }, [assessment.id]);

    const fetchAssessmentStats = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/stats`
            );
            
            if (response.ok) {
                const stats = await response.json();
                
                // Add dummy question performance data
                const dummyQuestions = [
                    { question_number: 1, question_title: 'Introduction to Algorithms', max_marks: 10, graded_count: 42, ungraded_count: 3, average_mark: 8.5, average_percentage: 85, highest_mark: 10, lowest_mark: 5 },
                    { question_number: 2, question_title: 'Data Structures Analysis', max_marks: 15, graded_count: 38, ungraded_count: 7, average_mark: 11.2, average_percentage: 74.7, highest_mark: 15, lowest_mark: 6 },
                    { question_number: 3, question_title: 'Sorting Algorithms', max_marks: 12, graded_count: 40, ungraded_count: 5, average_mark: 9.8, average_percentage: 81.7, highest_mark: 12, lowest_mark: 7 },
                    { question_number: 4, question_title: 'Graph Theory Basics', max_marks: 8, graded_count: 45, ungraded_count: 0, average_mark: 6.4, average_percentage: 80, highest_mark: 8, lowest_mark: 4 },
                    { question_number: 5, question_title: 'Dynamic Programming', max_marks: 20, graded_count: 30, ungraded_count: 15, average_mark: 14.5, average_percentage: 72.5, highest_mark: 20, lowest_mark: 8 },
                    { question_number: 6, question_title: 'Tree Traversal Methods', max_marks: 10, graded_count: 41, ungraded_count: 4, average_mark: 7.9, average_percentage: 79, highest_mark: 10, lowest_mark: 5 },
                    { question_number: 7, question_title: 'Hash Tables Implementation', max_marks: 14, graded_count: 36, ungraded_count: 9, average_mark: 10.8, average_percentage: 77.1, highest_mark: 14, lowest_mark: 6 },
                    { question_number: 8, question_title: 'Complexity Analysis', max_marks: 11, graded_count: 43, ungraded_count: 2, average_mark: 9.1, average_percentage: 82.7, highest_mark: 11, lowest_mark: 6 },
                    { question_number: 9, question_title: 'Recursive Solutions', max_marks: 16, graded_count: 39, ungraded_count: 6, average_mark: 12.3, average_percentage: 76.9, highest_mark: 16, lowest_mark: 7 },
                    { question_number: 10, question_title: 'Algorithm Optimization', max_marks: 18, graded_count: 35, ungraded_count: 10, average_mark: 13.7, average_percentage: 76.1, highest_mark: 18, lowest_mark: 8 },
                ];
                
                setAssessmentStats({
                    ...stats,
                    question_performance: [...(stats.question_performance || []), ...dummyQuestions]
                });
            } else {
                console.error('Failed to fetch assessment stats');
                setAssessmentStats({
                    grading_completion: {
                        total_submissions: 0,
                        graded_submissions: 0,
                        ungraded_submissions: 0,
                        completion_percentage: 0
                    },
                    grade_distribution: {
                        average_score: 0,
                        median_score: 0,
                        highest_score: 0,
                        lowest_score: 0,
                        score_ranges: []
                    },
                    question_performance: []
                });
            }
        } catch (error) {
            console.error('Error fetching assessment stats:', error);
            setAssessmentStats({
                grading_completion: {
                    total_submissions: 0,
                    graded_submissions: 0,
                    ungraded_submissions: 0,
                    completion_percentage: 0
                },
                grade_distribution: {
                    average_score: 0,
                    median_score: 0,
                    highest_score: 0,
                    lowest_score: 0,
                    score_ranges: []
                },
                question_performance: []
            });
        } finally {
            setLoading(false);
        }
    };

    const getProgressBarColor = (percentage: number) => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    const handleTogglePublishStatus = async () => {
        if (isUpdatingPublishStatus) return;
        
        setIsUpdatingPublishStatus(true);
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/publish`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        published: !assessment.published,
                    }),
                }
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to update publish status");
            }

            const updatedAssessment = await res.json();
            onAssessmentUpdate?.(updatedAssessment);
            
            const action = updatedAssessment.published ? "published" : "unpublished";
            alert(`Assessment ${action} successfully`);
        } catch (err) {
            console.error("Failed to update publish status", err);
            alert("Failed to update publish status: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setIsUpdatingPublishStatus(false);
        }
    };

    const handleAnswerSheetPDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !assessment) return;

        const formData = new FormData();
        formData.append("assessment_id", assessment.id);

        Array.from(files).forEach(file => {
            formData.append("files", file);
        });

        try {
            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/uploaded-files/bulk-upload`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Upload failed");
            }

            const result = await res.json();
            alert(`Successfully uploaded ${result.length} answer sheets`);
        } catch (err) {
            console.error(err);
            alert("Bulk upload failed");
        }
    };

    const handleDownloadStudentCSV = async () => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment.id}/results/download`
            );

            if (!res.ok) {
                console.error('Failed to download CSV');
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `assessment_${assessment.id}_results.csv`;
            a.click();
            a.remove();
        } catch (err) {
            console.error('Error downloading CSV', err);
        }
    };

    const handleExportAnnotatedPdfs = async () => {
        try {
            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/export/annotated-pdfs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    course_id: course.id,
                    assessment_id: assessment.id,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Export failed");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `annotated_pdfs_course_${course.id}_assessment_${assessment.id}.zip`;
            a.click();
            a.remove();
        } catch (err) {
            console.error("Failed to export PDFs", err);
            alert("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
        }
    };

    return (
        <div className={`${isMobile ? 'p-4' : 'p-6'} h-full max-h-screen flex flex-col border-zinc-800 overflow-hidden font-raleway`}>
            {/* Assessment Header - Fixed */}
            <div className="space-y-2 flex-shrink-0">
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-brand-primary-800`}>{assessment.title}</h1>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-brand-primary-600`}>
                    Course: {course.title}
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8 flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading assessment statistics...</span>
                </div>
            ) : (
                <div className="flex flex-col space-y-6 flex-1 min-h-0 mt-6">
                    {/* Compact Action Bar */}
                    <div className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 rounded-lg border-2 border-brand-accent-400 p-4 flex-shrink-0">
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-brand-primary-700 uppercase">Marking</h3>
                                    <p className="text-lg font-bold text-brand-primary-700">
                                        {assessmentStats?.grading_completion.completion_percentage || 0}%
                                    </p>
                                    <p className="text-xs text-brand-primary-600">
                                        {assessmentStats?.grading_completion.graded_submissions || 0}/{assessmentStats?.grading_completion.total_submissions || 0} marked
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveMode('mark')}
                                    className="px-3 py-1.5 bg-brand-primary-600 text-white rounded text-sm hover:bg-brand-primary-700 transition-colors"
                                >
                                    Mark
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-brand-primary-700 uppercase">Submissions</h3>
                                    <p className="text-lg font-bold text-brand-accent-700">
                                        {assessmentStats?.grading_completion.total_submissions || 0}
                                    </p>
                                    <p className="text-xs text-brand-primary-600">Answer sheets</p>
                                </div>
                                <label className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 cursor-pointer transition-colors">
                                    Upload
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        multiple
                                        onChange={handleAnswerSheetPDFUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-brand-primary-700 uppercase">Publication</h3>
                                    <p className="text-lg font-bold text-green-600">
                                        {assessment.published ? 'Live' : 'Unpublished'}
                                    </p>
                                    <p className="text-xs text-brand-primary-600">
                                        {assessment.published ? 'Visible to students' : 'Hidden'}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={handleDownloadStudentCSV}
                                        className="px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                        title="Download CSV"
                                    >
                                        CSV
                                    </button>
                                    <button
                                        onClick={handleExportAnnotatedPdfs}
                                        className="px-2 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors"
                                        title="Export PDFs"
                                    >
                                        PDFs
                                    </button>
                                    <button
                                        onClick={handleTogglePublishStatus}
                                        disabled={isUpdatingPublishStatus}
                                        className={`px-2 py-1.5 text-xs rounded transition-colors ${
                                            assessment.published 
                                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                        } disabled:opacity-50`}
                                        title={assessment.published ? "Hide from students" : "Publish to students"}
                                    >
                                        {isUpdatingPublishStatus ? '...' : assessment.published ? 'Hide' : 'Publish'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question Performance and Queries - Stacked Collapsible Sections */}
                    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
                        {/* Question Performance Table */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
                            <div 
                                className="px-6 py-4 bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 flex-shrink-0 cursor-pointer hover:from-brand-primary-600 hover:to-brand-primary-800 transition-all"
                                onClick={() => setIsQuestionsExpanded(!isQuestionsExpanded)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>
                                            Question Performance
                                        </h2>
                                        <span className="text-brand-accent-200 text-sm">
                                            ({assessmentStats?.question_performance?.length || 0} questions)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMode('map');
                                            }}
                                            className="px-3 py-1 bg-white text-brand-primary-700 rounded text-sm hover:bg-brand-primary-50 transition-colors font-semibold"
                                        >
                                            Map Questions
                                        </button>
                                        {isQuestionsExpanded ? (
                                            <ChevronUp className="h-5 w-5 text-white" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {isQuestionsExpanded && (
                                <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                                    {assessmentStats?.question_performance && assessmentStats.question_performance.length > 0 ? (
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Title</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Max Marks</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Progress</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Average</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {assessmentStats.question_performance.map((question, index) => {
                                                    const gradingPercentage = Math.round(
                                                        (question.graded_count / (question.graded_count + question.ungraded_count)) * 100
                                                    );

                                                    return (
                                                        <tr key={index} className="hover:bg-brand-primary-50 transition-colors duration-150">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <p className="text-sm font-semibold text-gray-900">{question.question_title}</p>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="text-sm font-semibold text-brand-primary-700">{question.max_marks}</span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span className="text-brand-primary-700 font-semibold">{question.graded_count}/{question.graded_count + question.ungraded_count}</span>
                                                                        <span className="text-brand-primary-600">{gradingPercentage}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-brand-accent-200 rounded-full h-2">
                                                                        <div 
                                                                            className={`h-2 rounded-full ${getProgressBarColor(gradingPercentage)}`}
                                                                            style={{ width: `${gradingPercentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div>
                                                                    <p className="text-sm font-semibold text-brand-accent-700">
                                                                        {question.average_mark?.toFixed(1) || 'N/A'}/{question.max_marks}
                                                                    </p>
                                                                    <p className="text-xs text-brand-primary-600">
                                                                        {question.average_percentage?.toFixed(0) || 'N/A'}%
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-brand-primary-400 text-lg">No question data available</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Query Management Section */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
                            <div 
                                className="px-6 py-4 bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 flex-shrink-0 cursor-pointer hover:from-brand-primary-600 hover:to-brand-primary-800 transition-all"
                                onClick={(e) => {
                                    // Don't collapse when clicking the select
                                    if ((e.target as HTMLElement).tagName !== 'SELECT' && 
                                        !(e.target as HTMLElement).closest('select')) {
                                        setIsQueriesExpanded(!isQueriesExpanded);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>
                                            Mark Queries
                                        </h2>
                                        <span className="text-brand-accent-200 text-sm">
                                            ({queryCount} {queryCount === 1 ? 'query' : 'queries'})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={queryFilterStatus}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setQueryFilterStatus(e.target.value);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-3 py-1.5 border-2 border-brand-accent-400 rounded-lg text-sm bg-white text-brand-primary-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent-500"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="all">All</option>
                                        </select>
                                        {isQueriesExpanded ? (
                                            <ChevronUp className="h-5 w-5 text-white" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {isQueriesExpanded && (
                                <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                                    <QueryManagement 
                                        courseId={course.id.toString()}
                                        assessmentId={assessment.id.toString()}
                                        hideHeader={true}
                                        filterStatus={queryFilterStatus}
                                        onFilterChange={setQueryFilterStatus}
                                        onCountChange={setQueryCount}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
