'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScreenSize } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

// Import Shared Components
import TopBar from '@/app/components/TopBar';

// Import Lecturer Components
import LecturerNavBar from '@/app/dashboard/lecturer/NavBar';
import CourseView from '@dashboard/lecturer/course/CourseView';
import LecturerProfileView from '@dashboard/lecturer/profile/ProfileView';

// Import Student Components
import StudentDashboardWrapper from '@/app/dashboard/student/StudentDashboardWrapper';

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('courses');

  // Use the auth hook instead of manual JWT handling
  const { user, isLoading, isAuthenticated, isStudent, isLecturer, isAdmin, logout } = useAuth();

  // Screen size detection
  const { isMobile, isTablet, isDesktop } = useScreenSize();
  const router = useRouter();

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setIsLeftSidebarCollapsed(true);
    } else if (isDesktop) {
      setIsLeftSidebarCollapsed(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isLoading, isAuthenticated, router]);

  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          <p className="mt-4 text-brand-primary-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Student Dashboard
  if (isStudent()) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50 font-raleway">
        <TopBar 
          userEmail={user?.email}
          isMobile={isMobile}
          isTablet={isTablet}
        />
        
        {/* Student Dashboard Content */}
        <StudentDashboardWrapper 
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>
    );
  }

  // Lecturer Dashboard (lecturer or admin)
  if (isLecturer() || isAdmin()) {
    return (
      <div className="flex flex-col h-screen overflow-hidden font-raleway">
        <TopBar 
          userEmail={user?.email}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        <div className={`flex flex-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
          {/* Navigation - Always visible, show as bottom bar on mobile, side bar on tablet/desktop */}
          {isMobile ? (
            <div className="order-2">
              <LecturerNavBar 
                activeNavItem={activeNavItem} 
                itemSelected={setActiveNavItem}
                onToggleSidebar={toggleLeftSidebar}
                isSidebarVisible={!isLeftSidebarCollapsed}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            </div>
          ) : (
            <LecturerNavBar 
              activeNavItem={activeNavItem} 
              itemSelected={setActiveNavItem}
              onToggleSidebar={toggleLeftSidebar}
              isSidebarVisible={!isLeftSidebarCollapsed}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          )}

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
          </div>
        </div>
      </div>
    );
  }

  // Unknown role - show error
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Access Error
        </h2>
        <p className="text-gray-600 mb-6">
          Your account role is not recognized.
          Please contact your administrator.
        </p>
        <button
          onClick={() => {
            logout();
          }}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
