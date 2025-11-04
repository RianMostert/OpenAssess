'use client';

import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import StudentDashboard from './StudentDashboard';
import StudentNavBar from './StudentNavBar';
import CourseView from '@dashboard/lecturer/course/CourseView';
// import LecturerNavBar from '@dashboard/lecturer/NavBar';
import LecturerProfileView from '@dashboard/lecturer/profile/ProfileView';

interface StudentDashboardWrapperProps {
    isMobile?: boolean;
    isTablet?: boolean;
}

interface UserInfo {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    primary_role_id?: number;
}

interface Course {
    id: string;
    title: string;
    code: string;
    teacher_name: string;
    my_role: string;
    created_at: string;
}

export default function StudentDashboardWrapper({ 
    isMobile = false, 
    isTablet = false 
}: StudentDashboardWrapperProps) {
    const [activeView, setActiveView] = useState<'student' | 'lecturer'>('student');
    const [hasLecturerAccess, setHasLecturerAccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
    const [activeNavItem, setActiveNavItem] = useState('courses');

    useEffect(() => {
        checkLecturerAccess();
    }, []);

    // Auto-collapse sidebar on mobile/tablet for lecturer view
    useEffect(() => {
        if (activeView === 'lecturer') {
            if (isMobile || isTablet) {
                setIsLeftSidebarCollapsed(true);
            } else {
                setIsLeftSidebarCollapsed(false);
            }
        }
    }, [isMobile, isTablet, activeView]);

    const checkLecturerAccess = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/student-results/my-courses`);
            
            if (response.ok) {
                const courses: Course[] = await response.json();
                // Check if student has facilitator or convener role in any course
                const hasAccess = courses.some(course => 
                    course.my_role === 'facilitator' || course.my_role === 'convener'
                );
                setHasLecturerAccess(hasAccess);
            }
        } catch (error) {
            console.error('Error checking lecturer access:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLeftSidebar = () => {
        setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
    };

    if (loading) {
        return (
            <div className="flex-1 bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // If in student view or no lecturer access, show student dashboard
    if (activeView === 'student' || !hasLecturerAccess) {
        return (
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
                {/* Navigation Bar - only show if has lecturer access */}
                {!isMobile && hasLecturerAccess && (
                    <StudentNavBar 
                        activeView={activeView}
                        onViewChange={setActiveView}
                        hasLecturerAccess={hasLecturerAccess}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}
                
                {/* Student Dashboard */}
                <StudentDashboard 
                    isMobile={isMobile}
                    isTablet={isTablet}
                />
                
                {/* Mobile navigation at bottom */}
                {isMobile && hasLecturerAccess && (
                    <StudentNavBar 
                        activeView={activeView}
                        onViewChange={setActiveView}
                        hasLecturerAccess={hasLecturerAccess}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}
            </div>
        );
    }

    // Lecturer view - show the same interface lecturers see
    return (
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
            {/* Student View/Lecturer View Toggle - Show first on desktop/tablet */}
            {!isMobile && (
                <StudentNavBar 
                    activeView={activeView}
                    onViewChange={setActiveView}
                    hasLecturerAccess={hasLecturerAccess}
                    isMobile={isMobile}
                    isTablet={isTablet}
                />
            )}
            
            {/* Lecturer Navigation */}
            {/* {isMobile ? (
                <div className="order-2 border-t border-zinc-800">
                    <LecturerNavBar 
                        activeNavItem={activeNavItem} 
                        itemSelected={setActiveNavItem}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                </div>
            ) : (
                <div className={`flex flex-col border-r border-zinc-800 transition-all duration-300 ${
                    isLeftSidebarCollapsed ? 'w-0 overflow-hidden' : isTablet ? 'w-16' : 'w-16'
                }`}>
                    <LecturerNavBar 
                        activeNavItem={activeNavItem} 
                        itemSelected={setActiveNavItem}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                </div>
            )} */}

            {/* Main content area */}
            <div className={`flex-1 min-h-0 overflow-hidden ${isMobile ? 'order-1' : ''}`}>
                {activeNavItem === 'courses' && (
                    <CourseView 
                        onToggleCollapse={toggleLeftSidebar} 
                        isCollapsed={isLeftSidebarCollapsed}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}
                {activeNavItem === 'profile' && (
                    <LecturerProfileView 
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}
                {activeNavItem === 'settings' && (
                    <div className="p-6 text-muted-foreground">
                        Settings view (to be implemented)
                    </div>
                )}
            </div>
            
            {/* Mobile navigation - Student/Lecturer toggle at bottom */}
            {isMobile && (
                <div className="order-3">
                    <StudentNavBar 
                        activeView={activeView}
                        onViewChange={setActiveView}
                        hasLecturerAccess={hasLecturerAccess}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                </div>
            )}
        </div>
    );
}
