import { Assessment, Course } from "@/types/course";
import { useState, useEffect } from "react";
import QueryManagement from "@/app/dashboard/lecturer/course/components/QueryManagement";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { assessmentService, fileService, exportService } from '@/services';
import { API_CONFIG } from '@/lib/constants';

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
            // Use assessmentService to fetch stats
            const stats = await assessmentService.getAssessmentStats(course.id, assessment.id);
            
            setAssessmentStats({
                ...stats,
                question_performance: [...(stats.question_performance || [])]
            });
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
        if (percentage >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    };
    const handleTogglePublishStatus = async () => {
        if (isUpdatingPublishStatus) return;
        
        setIsUpdatingPublishStatus(true);
        try {
            const updatedAssessment = await assessmentService.togglePublishStatus(
                assessment.id,
                !assessment.published
            );

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

        try {
            const filesArray = Array.from(files);
            const result = await fileService.bulkUploadAnswerSheets(assessment.id, filesArray);
            
            if (result.length === 0) {
                alert(`Warning: No answer sheets were uploaded.\n\nPossible reasons:\n- Files must be named with student number (e.g., "24138096_answers.pdf")\n- Student numbers must exist in the database\n- Files must be PDF format\n\nFiles attempted: ${filesArray.length}`);
            } else {
                alert(`Successfully uploaded ${result.length} answer sheets out of ${filesArray.length} files`);
                fetchAssessmentStats(); // Refresh stats after upload
            }
        } catch (err) {
            console.error(err);
            alert("Bulk upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
        }
    };

    const handleDownloadStudentCSV = async () => {
        try {
            const blob = await assessmentService.downloadResultsCSV(assessment.id);
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `assessment_${assessment.id}_results.csv`;
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading CSV', err);
            alert('Failed to download CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleExportAnnotatedPdfs = async () => {
        try {
            await exportService.exportAnnotatedPdfs(course.id, assessment.id);
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
                    {/* Action Cards - Horizontal Grid */}
                    <div className={`${isMobile ? 'w-full' : 'max-w-full'} flex-shrink-0`}>
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                            {/* Marking Card */}
                            <div className="bg-gradient-to-br from-brand-primary-50 to-white p-4 rounded-lg border-2 border-brand-accent-400">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-brand-primary-700">Marking Progress</h3>
                                    <button
                                        onClick={() => setActiveMode('mark')}
                                        className="px-3 py-1.5 bg-brand-primary-600 text-white rounded text-sm font-semibold hover:bg-brand-primary-700 transition-colors"
                                    >
                                        Mark
                                    </button>
                                </div>
                                <p className="text-2xl font-bold text-brand-primary-700">
                                    {assessmentStats?.grading_completion.completion_percentage || 0}%
                                </p>
                                <p className="text-xs text-brand-primary-600 mt-1">
                                    {assessmentStats?.grading_completion.graded_submissions || 0} of {assessmentStats?.grading_completion.total_submissions || 0} submissions graded
                                </p>
                            </div>

                            {/* Submissions Card */}
                            <div className="bg-gradient-to-br from-brand-accent-50 to-white p-4 rounded-lg border-2 border-brand-accent-400">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-brand-primary-700">Answer Sheets</h3>
                                    <label className="px-3 py-1.5 bg-brand-primary-600 text-white rounded text-sm font-semibold hover:bg-brand-primary-700 cursor-pointer transition-colors">
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
                                <p className="text-2xl font-bold text-brand-primary-700">
                                    {assessmentStats?.grading_completion.total_submissions || 0}
                                </p>
                                <p className="text-xs text-brand-primary-600 mt-1">
                                    Total submissions uploaded
                                </p>
                            </div>

                            {/* Publication Card */}
                            <div className="bg-gradient-to-br from-brand-primary-50 to-white p-4 rounded-lg border-2 border-brand-accent-400">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-brand-primary-700">Publication Status</h3>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={handleDownloadStudentCSV}
                                            className="px-2 py-1 bg-brand-primary-600 text-white rounded text-xs hover:bg-brand-primary-700 transition-colors"
                                            title="Download CSV"
                                        >
                                            CSV
                                        </button>
                                        <button
                                            onClick={handleExportAnnotatedPdfs}
                                            className="px-2 py-1 bg-brand-primary-600 text-white rounded text-xs hover:bg-brand-primary-700 transition-colors"
                                            title="Export PDFs"
                                        >
                                            PDFs
                                        </button>
                                        <button
                                            onClick={handleTogglePublishStatus}
                                            disabled={isUpdatingPublishStatus}
                                            className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                                                assessment.published 
                                                    ? 'bg-brand-primary-600 hover:bg-brand-primary-700 text-white' 
                                                    : 'bg-brand-accent-600 hover:bg-brand-accent-700 text-white'
                                            } disabled:opacity-50`}
                                        >
                                            {isUpdatingPublishStatus ? '...' : assessment.published ? 'Hide' : 'Publish'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-brand-primary-700">
                                    {assessment.published ? 'Published' : 'Unpublished'}
                                </p>
                                <p className="text-xs text-brand-primary-600 mt-1">
                                    {assessment.published ? 'Results are visible to students' : 'Results are hidden from students'}
                                </p>
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
                                            {/* <option value="under_review">Under Review</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option> */}
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
