import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Assessment, Course } from "@/types/course";

interface CourseOverviewProps {
    course: Course | null;
    assessment: Assessment | null;
    setActiveMode: (mode: 'view' | 'map' | 'grade') => void;
}

export default function CourseOverview({
    course,
    assessment,
    setActiveMode,
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



    const handleAnswerSheetPDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // TODO: handle PDF upload logic here
            console.log("Answer sheet PDF uploaded:", file.name);
        }
    };

    if (!course) {
        return <div className="p-6 text-muted-foreground">No course selected</div>;
    }

    return (
        <div className="p-6 space-y-4 border-zinc-800 border-l">
            <h1 className="text-2xl font-semibold">{course.title}</h1>

            {assessment ? (
                <>
                    <h2 className="text-xl font-medium text-muted-foreground">
                        Assessment: {assessment.title}
                    </h2>

                    <div className="flex gap-2 mt-4 flex-wrap">
                        <button
                            onClick={() => setActiveMode('map')}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Mapping Mode
                        </button>

                        <button
                            onClick={() => setActiveMode('grade')}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Grading Mode
                        </button>

                        <label className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer">
                            Upload Student CSV
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleStudentCSVUpload}
                                className="hidden"
                            />
                        </label>

                        <label className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer">
                            Upload Answer Sheet PDFs
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleAnswerSheetPDFUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </>
            ) : (
                <p className="text-muted-foreground">Select an assessment to view details</p>
            )}
        </div>
    );
}
