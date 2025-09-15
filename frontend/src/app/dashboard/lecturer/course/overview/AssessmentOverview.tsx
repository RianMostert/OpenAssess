import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Assessment, Course } from "@/types/course";
import { useState, useEffect } from "react";

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
    setActiveMode: (mode: 'view' | 'map' | 'grade') => void;
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
                setAssessmentStats(stats);
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
        <div className={`${isMobile ? 'p-4' : 'p-6'} h-full max-h-screen flex flex-col border-zinc-800 overflow-hidden`}>
            {/* Assessment Header - Fixed */}
            <div className="space-y-2 flex-shrink-0">
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>{assessment.title}</h1>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
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
                    {/* Main Action Cards Row */}
                    <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'} gap-4 flex-shrink-0`}>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Grading Progress</h3>
                                <button
                                    onClick={() => setActiveMode('grade')}
                                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                >
                                    Grade
                                </button>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">
                                {assessmentStats?.grading_completion.completion_percentage || 0}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {assessmentStats?.grading_completion.graded_submissions || 0} of {assessmentStats?.grading_completion.total_submissions || 0} graded
                            </p>
                        </div>

                        <div className="bg-card p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Upload PDFs</h3>
                                <label className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 cursor-pointer transition-colors">
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
                            <p className="text-2xl font-bold text-purple-600">
                                {assessmentStats?.grading_completion.total_submissions || 0}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Answer sheets</p>
                        </div>

                        <div className="bg-card p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Publication</h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={handleDownloadStudentCSV}
                                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                    >
                                        CSV
                                    </button>
                                    <button
                                        onClick={handleExportAnnotatedPdfs}
                                        className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors"
                                    >
                                        PDFs
                                    </button>
                                    <button
                                        onClick={handleTogglePublishStatus}
                                        disabled={isUpdatingPublishStatus}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${
                                            assessment.published 
                                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                        } disabled:opacity-50`}
                                    >
                                        {isUpdatingPublishStatus ? 'Wait...' : assessment.published ? 'Hide' : 'Publish'}
                                    </button>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                                {assessment.published ? 'Live' : 'Unpublished'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {assessment.published ? 'Visible to students' : 'Hidden from students'}
                            </p>
                        </div>
                    </div>

                    {/* Grade Distribution Cards */}
                    {/* <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-2'} gap-4 flex-shrink-0`}>
                        <div className="bg-card p-4 rounded-lg border">
                            <h3 className="text-sm font-medium text-muted-foreground">Average Grade</h3>
                            <p className="text-2xl font-bold text-blue-600">
                                {assessmentStats?.grade_distribution.average_score || 0}%
                            </p>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <h3 className="text-sm font-medium text-muted-foreground">Highest Grade</h3>
                            <p className="text-2xl font-bold text-green-600">
                                {assessmentStats?.grade_distribution.highest_score || 0}%
                            </p>
                        </div>
                    </div> */}

                    {/* Grade Distribution Chart */}
                    {/*
                    {assessmentStats?.grade_distribution.score_ranges && assessmentStats.grade_distribution.score_ranges.length > 0 && (
                        <div className="bg-card rounded-lg border flex-shrink-0">
                            <div className="p-4 border-b">
                                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Grade Distribution</h2>
                            </div>
                            <div className="p-4">
                                <div className="space-y-2">
                                    {assessmentStats.grade_distribution.score_ranges.map((range, index) => (
                                        <div key={index} className="flex items-center space-x-4">
                                            <div className="w-16 text-sm font-medium">{range.range}%</div>
                                            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                                <div 
                                                    className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                                                    style={{ 
                                                        width: `${assessmentStats.grading_completion.graded_submissions > 0 ? (range.count / assessmentStats.grading_completion.graded_submissions) * 100 : 0}%`,
                                                        minWidth: range.count > 0 ? '2rem' : '0'
                                                    }}
                                                >
                                                    {range.count > 0 && <span className="text-xs text-white font-medium">{range.count}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    */}

                    {/* Question Performance Table - Scrollable */}
                    <div className="bg-card rounded-lg border flex flex-col flex-1 min-h-0 max-h-96">
                        <div className="p-4 border-b flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Question-wise Performance</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        {assessmentStats?.question_performance.length || 0} questions
                                    </span>
                                    <button
                                        onClick={() => setActiveMode('map')}
                                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                                    >
                                        Map Questions
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {assessmentStats?.question_performance && assessmentStats.question_performance.length > 0 ? (
                            <div className="flex-1 overflow-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="border-b">
                                            <th className="text-left p-3 font-medium">Title</th>
                                            <th className="text-left p-3 font-medium">Max Marks</th>
                                            <th className="text-left p-3 font-medium">Grading Progress</th>
                                            <th className="text-left p-3 font-medium">Average Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assessmentStats.question_performance.map((question, index) => {
                                            const gradingPercentage = Math.round(
                                                (question.graded_count / (question.graded_count + question.ungraded_count)) * 100
                                            );

                                            return (
                                                <tr key={index} className="border-b hover:bg-muted/30">
                                                    <td className="p-3">
                                                        <p className="font-medium">{question.question_title}</p>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-medium">{question.max_marks}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span>{question.graded_count}/{question.graded_count + question.ungraded_count}</span>
                                                                <span className="text-muted-foreground">{gradingPercentage}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${getProgressBarColor(gradingPercentage)}`}
                                                                    style={{ width: `${gradingPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div>
                                                            <p className="font-medium">{question.average_mark}</p>
                                                            <p className="text-sm text-muted-foreground">{question.average_percentage}%</p>
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
                                    <p>No questions found for this assessment.</p>
                                    <p className="text-sm mt-2">Add questions to see performance statistics.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
