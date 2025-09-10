import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Assessment, Course } from "@/types/course";
import { useState } from "react";

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
        <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 border-zinc-800 overflow-y-auto`}>
            <div className="space-y-2">
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>{assessment.title}</h1>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
                    Course: {course.title}
                </p>
            </div>

            <div className={`flex gap-2 mt-6 ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
                <button
                    onClick={handleTogglePublishStatus}
                    disabled={isUpdatingPublishStatus}
                    className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} ${
                        assessment.published 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-green-500 hover:bg-green-600'
                    } text-white rounded disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'text-sm' : ''}`}
                >
                    {isUpdatingPublishStatus 
                        ? 'Updating...' 
                        : assessment.published 
                            ? 'Unpublish Results' 
                            : 'Publish Results'
                    }
                </button>

                <button
                    onClick={() => setActiveMode('map')}
                    className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} bg-blue-500 text-white rounded hover:bg-blue-600 ${isMobile ? 'text-sm' : ''}`}
                >
                    Mapping Mode
                </button>

                <button
                    onClick={() => setActiveMode('grade')}
                    className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} bg-green-500 text-white rounded hover:bg-green-600 ${isMobile ? 'text-sm' : ''}`}
                >
                    Grading Mode
                </button>

                <label className={`${isMobile ? 'w-full py-3 text-center' : 'px-4 py-2'} bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer ${isMobile ? 'text-sm' : ''}`}>
                    Upload Answer Sheet PDFs
                    <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleAnswerSheetPDFUpload}
                        className="hidden"
                    />
                </label>

                <button
                    onClick={handleDownloadStudentCSV}
                    className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer ${isMobile ? 'text-sm' : ''}`}
                >
                    Download Results CSV
                </button>

                <button
                    onClick={handleExportAnnotatedPdfs}
                    className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} bg-orange-500 text-white rounded hover:bg-orange-600 ${isMobile ? 'text-sm' : ''}`}
                >
                    Export Annotated PDFs
                </button>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}>Assessment Details</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        assessment.published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {assessment.published ? 'Published' : 'Draft'}
                    </span>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Assessment ID: {assessment.id}</p>
                    <p>Course: {course.title} ({course.code || 'No code'})</p>
                    <p>Status: {assessment.published ? 'Results visible to students' : 'Results hidden from students'}</p>
                    {/* Add more assessment details as needed */}
                </div>
            </div>
        </div>
    );
}
