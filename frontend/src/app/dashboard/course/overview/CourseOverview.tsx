import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Assessment, Course } from "@/types/course";

interface CourseOverviewProps {
    course: Course | null;
    assessment: Assessment | null;
    setActiveMode: (mode: 'view' | 'map' | 'grade') => void;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function CourseOverview({
    course,
    assessment,
    setActiveMode,
    isMobile = false,
    isTablet = false,
}: CourseOverviewProps) {
    const handleStudentCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        if (!course) {
            alert("Course is not available.");
            return;
        }
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
        } catch (err) {
            console.error(err);
            alert(`Error uploading CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
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
                `${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessment?.id}/results/download`
            );

            if (!res.ok) {
                console.error('Failed to download CSV');
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `assessment_${assessment?.id}_results.csv`;
            a.click();
            a.remove();
        } catch (err) {
            console.error('Error downloading CSV', err);
        }
    };

    const handleExportAnnotatedPdfs = async () => {
        if (!course || !assessment) {
            alert("Course or assessment not available.");
            return;
        }

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

    if (!course) {
        return <div className={`${isMobile ? 'p-4' : 'p-6'} text-muted-foreground`}>Select a course to get started</div>;
    }

    return (
        <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 border-zinc-800 overflow-y-auto`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>{course.title}</h1>

            {assessment ? (
                <>
                    <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium text-muted-foreground`}>
                        Assessment: {assessment.title}
                    </h2>

                    <div className={`flex gap-2 mt-4 ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
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

                        <label className={`${isMobile ? 'w-full py-3 text-center' : 'px-4 py-2'} bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer ${isMobile ? 'text-sm' : ''}`}>
                            Upload Student CSV
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleStudentCSVUpload}
                                className="hidden"
                            />
                        </label>

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
                            Download Student CSV
                        </button>

                        <button
                            onClick={handleExportAnnotatedPdfs}
                            className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} bg-orange-500 text-white rounded hover:bg-orange-600 ${isMobile ? 'text-sm' : ''}`}
                        >
                            Export Annotated PDFs
                        </button>

                    </div>
                </>
            ) : (
                <p className="text-muted-foreground">Select an assessment to view details</p>
            )}
        </div>
    );
}
