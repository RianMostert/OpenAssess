import { useEffect, useState } from 'react';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import CreateCourseModel from '@/app/dashboard/lecturer/course/components/CreateCourseModel';
import EditCourseModel from '@dashboard/lecturer/course/components/EditCourseModel';
import CreateAssessmentModel from '@/app/dashboard/lecturer/course/components/CreateAssessmentModel';
import EditAssessmentModel from '@/app/dashboard/lecturer/course/components/EditAssessmentModel';
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
    onToggleCollapse?: () => void;
    isMobile?: boolean;
    isTablet?: boolean;
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
    isMobile = false,
    isTablet = false,
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

    if (loading) return <div className={`border-zinc-800 border-r ${isMobile ? 'p-2' : 'p-4'}`}>Loading courses...</div>;

    // Mobile: Show as overlay/modal when not collapsed
    if (isMobile && !isCollapsed) {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onToggleCollapse}>
                <div 
                    className="absolute left-0 top-0 h-full bg-background border-r border-zinc-800 p-4 overflow-y-auto"
                    style={{ width: `${Math.min(width, window.innerWidth * 0.8)}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Your Courses</h2>
                        <CreateCourseModel onCourseAdded={fetchCourses} />
                    </div>
                    {/* Course list content */}
                    <Accordion type="multiple">
                        {courses.map((course) => (
                            <AccordionItem key={course.id} value={course.id}>
                                <div className="flex items-center justify-between w-full">
                                    <Button
                                        variant={selectedCourse?.id === course.id && !selectedAssessment ? "default" : "ghost"}
                                        className="flex-1 justify-start text-left"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedCourse?.(course);
                                            setSelectedAssessment?.(null);
                                            setActiveMode?.('view');
                                            if (isMobile) onToggleCollapse?.();
                                        }}
                                    >
                                        <span className="text-sm">{course.title}</span>
                                    </Button>
                                    <AccordionTrigger className="w-8 h-8 p-0 hover:bg-muted rounded">
                                    </AccordionTrigger>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="w-3 h-3" />
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
                                                    className="justify-start flex-1 text-xs"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedCourse?.(course);
                                                        setSelectedAssessment?.(assessment);
                                                        setActiveMode?.('view');
                                                        onToggleCollapse?.(); // Close sidebar on mobile after selection
                                                    }}
                                                >
                                                    {assessment.title}
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="w-3 h-3" />
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
                    {/* Modals */}
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
                </div>
            </div>
        );
    }

    return (
        <div className={`transition-all duration-300 ease-in-out border-zinc-800 border-r overflow-hidden`}
            style={{
                width: isCollapsed ? '0px' : `${isTablet ? Math.min(width, 200) : width}px`,
                minWidth: isCollapsed ? '0px' : `${isTablet ? Math.min(width, 200) : width}px`,
                padding: isCollapsed ? '0px' : isTablet ? '0.5rem' : '1rem'
            }}>
            {!isCollapsed && (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`font-semibold ${isTablet ? 'text-lg' : 'text-xl'}`}>
                            {isTablet ? 'Courses' : 'Your Courses'}
                        </h2>
                        <CreateCourseModel onCourseAdded={fetchCourses} />
                    </div>

                    <Accordion type="multiple">
                        {courses.map((course) => (
                            <AccordionItem key={course.id} value={course.id}>
                                <div className="flex items-center justify-between w-full">
                                    <Button
                                        variant={selectedCourse?.id === course.id && !selectedAssessment ? "default" : "ghost"}
                                        className="flex-1 justify-start text-left"
                                        size={isTablet ? "sm" : "default"}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedCourse?.(course);
                                            setSelectedAssessment?.(null);
                                            setActiveMode?.('view');
                                        }}
                                    >
                                        <span className={isTablet ? 'text-sm' : 'text-base'}>{course.title}</span>
                                    </Button>
                                    <AccordionTrigger className={`${isTablet ? 'w-6 h-6' : 'w-8 h-8'} p-0 hover:bg-muted rounded`}>
                                    </AccordionTrigger>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size={isTablet ? "sm" : "icon"}>
                                                <MoreVertical className={`${isTablet ? 'w-3 h-3' : 'w-4 h-4'}`} />
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
                                                    size={isTablet ? "sm" : "default"}
                                                    onClick={() => {
                                                        setSelectedCourse?.(course);
                                                        setSelectedAssessment?.(assessment);
                                                        setActiveMode?.('view');
                                                        console.log('Selected assessment:', assessment);
                                                    }}
                                                >
                                                    <span className={`${isTablet ? 'text-xs' : 'text-sm'} truncate`}>
                                                        {assessment.title}
                                                    </span>
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size={isTablet ? "sm" : "icon"}>
                                                            <MoreVertical className={`${isTablet ? 'w-3 h-3' : 'w-4 h-4'}`} />
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
