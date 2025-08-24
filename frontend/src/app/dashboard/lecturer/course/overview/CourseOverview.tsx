import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Course } from "@/types/course";

interface CourseOverviewProps {
    course: Course;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function CourseOverview({
    course,
    isMobile = false,
    isTablet = false,
}: CourseOverviewProps) {
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
        } catch (err) {
            console.error(err);
            alert(`Error uploading CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    };

    const handleDownloadStudentList = async () => {
        try {
            // Note: This endpoint will need to be created on the backend
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/courses/${course.id}/students/download`
            );

            if (!res.ok) {
                console.error('Failed to download student list');
                alert('Failed to download student list. This feature may need backend implementation.');
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `course_${course.id}_students.csv`;
            a.click();
            a.remove();
        } catch (err) {
            console.error('Error downloading student list', err);
            alert('Error downloading student list. This feature may need backend implementation.');
        }
    };

    return (
        <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 border-zinc-800 overflow-y-auto`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>{course.title}</h1>
            
            {course.code && (
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
                    Course Code: {course.code}
                </p>
            )}

            <div className="mt-6">
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium mb-4`}>Student Management</h2>
                
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
                    <label className={`${isMobile ? 'w-full py-3 text-center' : 'px-4 py-2'} bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer ${isMobile ? 'text-sm' : ''}`}>
                        Upload Student CSV
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleStudentCSVUpload}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={handleDownloadStudentList}
                        className={`${isMobile ? 'w-full py-3' : 'px-4 py-2'} bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer ${isMobile ? 'text-sm' : ''}`}
                    >
                        Download Student List
                    </button>
                </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium mb-2`}>Course Information</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Course ID: {course.id}</p>
                    {course.code && <p>Course Code: {course.code}</p>}
                    <p>Select an assessment from the sidebar to start grading or mapping.</p>
                </div>
            </div>
        </div>
    );
}
