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
import { Course, Assessment } from '@/types/course';
import { set } from 'react-hook-form';

type CourseWithAssessments = Course & { assessments: Assessment[] };

interface CoursePanelProps {
    assessments: Assessment[];
    setAssessments: (assessments: Assessment[] | null) => void;
    selectedAssessment?: Assessment | null;
    setSelectedAssessment?: (assessment: Assessment | null) => void;
    selectedCourse?: Course | null;
    setSelectedCourse?: (course: Course | null) => void;
    width?: number;
    setActiveMode?: (mode: 'view' | 'map' | 'grade') => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void
}

export default function CoursePanel({
    selectedAssessment,
    setSelectedAssessment,
    selectedCourse,
    setSelectedCourse,
    width = 250,
    setActiveMode,
    isCollapsed,
    onToggleCollapse,
}: CoursePanelProps) {
    const [courses, setCourses] = useState<CourseWithAssessments[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCourse, setEditingCourse] = useState<{
        id: string;
        title: string;
        code?: string;
    } | null>(null);

    const [modalType, setModalType] = useState<'editCourse' | 'createAssessment' | 'editAssessment' | null>(null);

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

        setModalType('editCourse');
    };

    const addAssessment = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        console.log('Adding assessment to course:', course);

        setCreatingAssessmentFor({
            id: course.id,
            title: course.title,
        });

        setModalType('createAssessment');
    };


    useEffect(() => {
        fetchCourses();
    }, []);

    if (loading) return <div className="p-4 border-zinc-800 border-r">Loading courses...</div>;

    return (
        <div className={`transition-all duration-300 ease-in-out border-zinc-800 border-r overflow-hidden`}
            style={{
                width: isCollapsed ? '0px' : `${width}px`,
                minWidth: isCollapsed ? '0px' : `${width}px`,
                padding: isCollapsed ? '0px' : '1rem'
            }}>
            {!isCollapsed && (<>
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
                                                    setActiveMode?.('view');
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
                                                            setModalType('editAssessment');
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
                {modalType === 'editCourse' && editingCourse && (
                    <EditCourseModel
                        open={true}
                        setOpen={(open) => {
                            if (!open) {
                                setModalType(null);
                                setEditingCourse(null);
                            }
                        }}
                        courseId={editingCourse.id}
                        initialTitle={editingCourse.title}
                        initialCode={editingCourse.code}
                        onCourseUpdated={() => {
                            setModalType(null);
                            fetchCourses();
                        }}
                    />
                )}

                {modalType === 'createAssessment' && creatingAssessmentFor && (
                    <CreateAssessmentModel
                        open={true}
                        setOpen={(open) => {
                            if (!open) {
                                setModalType(null);
                                setCreatingAssessmentFor(null);
                            }
                        }}
                        courseId={creatingAssessmentFor.id}
                        onAssessmentCreated={() => {
                            setModalType(null);
                            fetchCourses();
                        }}
                    />
                )}

                {modalType === 'editAssessment' && editingAssessment && (
                    <EditAssessmentModel
                        open={true}
                        setOpen={(open) => {
                            if (!open) {
                                setModalType(null);
                                setEditingAssessment(null);
                            }
                        }}
                        courseId={selectedCourse?.id || ''}
                        assessmentId={editingAssessment.id}
                        initialTitle={editingAssessment.title}
                        onAssessmentUpdated={() => {
                            fetchCourses();
                        }}
                    />
                )}
            </>
            )}
        </div >
    );
}
