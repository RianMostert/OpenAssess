import { useEffect, useState } from 'react';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import CreateCourseModel from '@/app/dashboard/course/components/CreateCourseModel';
import EditCourseModel from '@dashboard/course/components/EditCourseModel';
import CreateAssessmentModel from '@/app/dashboard/course/components/CreateAssessmentModel';
import EditAssessmentModel from '@/app/dashboard/course/components/EditAssessmentModel';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export interface Course {
    id: string;
    title: string;
    code?: string;
    teacher_id: string;
}

export interface Assessment {
    id: string;
    title: string;
}

type CourseWithAssessments = Course & { assessments: Assessment[] };

interface CoursePanelProps {
    assessments: Assessment[];
    setAssessments: (assessments: Assessment[] | null) => void;
    selectedAssessment?: Assessment | null;
    setSelectedAssessment?: (assessment: Assessment | null) => void;
    selectedCourse?: Course | null;
    setSelectedCourse?: (course: Course | null) => void;
    width?: number;
}

export default function CoursePanel({
    selectedAssessment,
    setSelectedAssessment,
    selectedCourse,
    setSelectedCourse,
    width = 250,
}: CoursePanelProps) {
    const [courses, setCourses] = useState<CourseWithAssessments[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCourse, setEditingCourse] = useState<{
        id: string;
        title: string;
        code?: string;
    } | null>(null);

    const [modelOpen, setModelOpen] = useState(false);

    const [creatingAssessmentFor, setCreatingAssessmentFor] = useState<{
        id: string;
        title: string;
    } | null>(null);

    const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);

    const deleteAssessment = async (assessmentId: string, courseId: string) => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${assessmentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete assessment');

            fetchCourses();
        } catch (error) {
            console.error('Error deleting assessment:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            let coursesData: Course[] = [];

            const userRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/users/me`);
            const user = await userRes.json();

            if (user.is_admin) {
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses`);
                coursesData = await res.json();
            } else {
                const idRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/my-course-ids`);
                const courseIds: string[] = await idRes.json();
                console.log('Course IDs:', courseIds);

                const courseResponses = await Promise.all(
                    courseIds.map(async (id) => {
                        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`);
                        if (!res.ok) return null;
                        return res.json();
                    })
                );

                coursesData = courseResponses.filter(Boolean) as Course[];
            }

            const coursesWithAssessments: CourseWithAssessments[] = await Promise.all(
                coursesData.map(async (course) => {
                    try {
                        const assessRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/${course.id}/assessments`);
                        const assessments: Assessment[] = await assessRes.json();
                        return { ...course, assessments };
                    } catch {
                        return { ...course, assessments: [] };
                    }
                })
            );

            setCourses(coursesWithAssessments);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteCourse = async (courseId: string) => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete course');

            // Refresh the course list after deletion
            fetchCourses();
            setSelectedAssessment?.(null);
            setSelectedCourse?.(null);
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    }

    const editCourse = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        console.log('Editing course:', course);

        setEditingCourse({
            id: course.id,
            title: course.title,
            code: course.code,
        });

        setModelOpen(true);
    };

    const addAssessment = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        console.log('Adding assessment to course:', course);

        setCreatingAssessmentFor({
            id: course.id,
            title: course.title,
        });

        setModelOpen(true); // open the modal
    };


    useEffect(() => {
        fetchCourses();
    }, []);

    if (loading) return <div className="p-4 border-zinc-800 border-r">Loading courses...</div>;

    return (
        <div className="p-4 border-zinc-800 border-r " style={{ width: `${width}px`, minWidth: `${width}px` }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Courses</h2>
                <CreateCourseModel onCourseAdded={fetchCourses} />
            </div>

            <Accordion type="multiple">
                {courses.map((course) => (
                    <AccordionItem key={course.id} value={course.id}>
                        <div className="flex items-center justify-between w-full">
                            <AccordionTrigger className="flex-1 text-left">
                                <span>{course.title}</span>
                            </AccordionTrigger>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addAssessment(course.id);
                                    }}>
                                        Add Assignment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            editCourse(course.id);
                                        }}
                                    >
                                        Edit Course
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => deleteCourse(course.id)}>
                                        Delete Course
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <AccordionContent>
                            <div className="flex flex-col gap-2 pl-2">
                                {course.assessments.map((assessment) => (
                                    <div key={assessment.id} className="flex items-center justify-between pr-2">
                                        <Button
                                            variant={selectedAssessment?.id === assessment.id ? "default" : "outline"}
                                            className="justify-start flex-1"
                                            onClick={() => {
                                                setSelectedCourse?.(course);
                                                setSelectedAssessment?.(assessment);
                                                console.log('Selected assessment:', assessment);
                                            }}
                                        >
                                            {assessment.title}
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEditingAssessment(assessment);
                                                        setModelOpen(true);
                                                    }}
                                                >
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={async () => {
                                                        await deleteAssessment(assessment.id, course.id);
                                                    }}
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}

                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            {
                editingCourse && (
                    <EditCourseModel
                        open={modelOpen}
                        setOpen={setModelOpen}
                        courseId={editingCourse.id}
                        initialTitle={editingCourse.title}
                        initialCode={editingCourse.code}
                        onCourseUpdated={() => {
                            setModelOpen(false);
                            // setEditingCourse(null);
                            fetchCourses();
                        }}
                    />
                )
            }

            {creatingAssessmentFor && (
                <CreateAssessmentModel
                    courseId={creatingAssessmentFor.id}
                    open={modelOpen}
                    setOpen={setModelOpen}
                    onAssessmentCreated={() => {
                        setModelOpen(false);
                        setCreatingAssessmentFor(null);
                        fetchCourses();
                    }}
                />
            )}

            {editingAssessment && (
                <EditAssessmentModel
                    assessmentId={editingAssessment.id}
                    initialTitle={editingAssessment.title}
                    open={modelOpen}
                    setOpen={(open) => {
                        setModelOpen(open);
                        if (!open) setEditingAssessment(null);
                    }}
                    onAssessmentUpdated={() => {
                        fetchCourses();
                    }}
                />
            )}

        </div >
    );
}
