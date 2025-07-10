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

                    <div className="flex gap-2 mt-4">
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
                    </div>
                </>
            ) : (
                <p className="text-muted-foreground">Select an assessment to view details</p>
            )}
        </div>
    );
}
