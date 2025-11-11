import { useEffect, useState } from 'react';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, PanelLeft, FileText } from 'lucide-react';
import CreateCourseModel from '@/app/dashboard/lecturer/course/components/CreateCourseModel';
import EditCourseModel from '@dashboard/lecturer/course/components/EditCourseModel';
import CreateAssessmentModel from '@/app/dashboard/lecturer/course/components/CreateAssessmentModel';
import EditAssessmentModel from '@/app/dashboard/lecturer/course/components/EditAssessmentModel';
import { courseService, assessmentService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { Course, Assessment } from '@/types/course';

type CourseWithAssessments = Course & { assessments: Assessment[] };

interface CoursePanelProps {
    assessments: Assessment[];
    setAssessments: (assessments: Assessment[] | null) => void;
    selectedAssessment?: Assessment | null;
    setSelectedAssessment?: (assessment: Assessment | null) => void;
    selectedCourse?: Course | null;
    setSelectedCourse?: (course: Course | null) => void;
    width?: number;
    setActiveMode?: (mode: 'view' | 'map' | 'mark') => void;
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
    
    // Use auth hook to check admin status
    const { isAdmin } = useAuth();

    const deleteAssessment = async (assessmentId: string, courseId: string) => {
        try {
            // Pass UUID string directly
            await assessmentService.deleteAssessment(assessmentId);
            fetchCourses();
        } catch (error) {
            console.error('Error deleting assessment:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            // Use courseService - returns courses with UUID strings
            const apiCourses = await courseService.getCourses();
            
            // Map API courses to local Course type - IDs are already strings (UUIDs)
            const coursesData: Course[] = apiCourses.map(c => ({
                id: c.id, // Already a UUID string, no conversion needed
                title: c.title,
                code: c.code || undefined,
                teacher_id: c.teacher_id,
            }));

            const coursesWithAssessments: CourseWithAssessments[] = await Promise.all(
                coursesData.map(async (course) => {
                    try {
                        // Pass UUID string directly, no conversion
                        const apiAssessments = await courseService.getAssessments(course.id);
                        
                        // Map API assessments to local Assessment type
                        const assessments: Assessment[] = apiAssessments.map(a => ({
                            id: a.id, // Already a UUID string
                            title: a.title,
                            published: false, // Not provided by API, default to false
                        }));
                        
                        return { ...course, assessments };
                    } catch (error) {
                        console.error(`Error fetching assessments for course ${course.id}:`, error);
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
            // Pass UUID string directly
            await courseService.deleteCourse(courseId);
            
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

        setCreatingAssessmentFor({
            id: course.id,
            title: course.title,
        });

        setModalType('createAssessment');
    };


    useEffect(() => {
        fetchCourses();
    }, []);

    if (loading) return <div className={`border-brand-accent border-r ${isMobile ? 'p-2' : 'p-4'} bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway`}>Loading courses...</div>;

    // Mobile: Show as overlay/modal when not collapsed
    if (isMobile && !isCollapsed) {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onToggleCollapse}>
                <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-br from-gray-50 to-brand-primary-50 border-r border-brand-accent shadow-xl p-4 overflow-y-auto font-raleway"
                    style={{ width: `${Math.min(width, window.innerWidth * 0.8)}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-brand-primary">Your Courses</h2>
                        <div className="flex items-center gap-2">
                            <CreateCourseModel onCourseAdded={fetchCourses} />
                            {/* <Button
                                variant="outline"
                                size="icon"
                                onClick={onToggleCollapse}
                                className="border-2 border-brand-accent-300 hover:bg-brand-accent-50"
                            >
                                <PanelLeft className="h-4 w-4 text-brand-primary" />
                            </Button> */}
                        </div>
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
                                        <DropdownMenuContent align="end" className="bg-white">
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
                                                    <DropdownMenuContent align="end" className="bg-white">
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

    // Desktop/Tablet: Don't render anything when collapsed
    if (isCollapsed) {
        return null;
    }

    return (
        <div className="border-brand-accent border-r bg-gradient-to-br from-gray-50 to-brand-primary-50 overflow-y-auto font-raleway"
            style={{
                width: `${isTablet ? Math.min(width, 200) : width}px`,
                minWidth: `${isTablet ? Math.min(width, 200) : width}px`,
                padding: isTablet ? '0.5rem' : '1rem'
            }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className={`font-bold text-brand-primary ${isTablet ? 'text-lg' : 'text-xl'}`}>
                    {isTablet ? 'Courses' : 'Your Courses'}
                </h2>
                <div className="flex items-center gap-2">
                    <CreateCourseModel onCourseAdded={fetchCourses} />
                    {/* <Button
                        variant="outline"
                        size="icon"
                        onClick={onToggleCollapse}
                        className="border-2 border-brand-accent-300 hover:bg-brand-accent-50"
                        title="Hide Courses Panel"
                    >
                        <PanelLeft className="h-4 w-4 text-brand-primary" />
                    </Button> */}
                </div>
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
                                        <DropdownMenuContent align="end" className="bg-white">
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
                                                    <DropdownMenuContent align="end" className="bg-white">
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
                </div>
    );
}
