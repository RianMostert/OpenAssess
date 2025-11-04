'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useScreenSize } from '@/hooks/use-mobile';
import { 
  UserInfo, 
  getRoleDisplayName, 
  isStudent, 
  canAccessLecturerDashboard 
} from '@/types/auth';

// Import Lecturer Components
import LecturerTopBar from '@/app/dashboard/lecturer/TopBar';
import LecturerNavBar from '@/app/dashboard/lecturer/NavBar';
import CourseView from '@dashboard/lecturer/course/CourseView';
import LecturerProfileView from '@dashboard/lecturer/profile/ProfileView';

// Import Student Components
import StudentDashboardWrapper from '@/app/dashboard/student/StudentDashboardWrapper';

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('courses');
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

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

  // Auth and role detection
  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token || isTokenExpired(token)) {
      localStorage.removeItem('authToken');
      router.push('/auth');
      return;
    }

    try {
      const decoded: UserInfo = jwtDecode(token);
      setUserInfo(decoded);
      setUserRole(decoded.primary_role_id);
      setIsAuthenticated(true);

      const exp = getTokenExpiration(token);
      const timeout = exp ? (exp * 1000 - Date.now()) : 0;

      const timer = setTimeout(() => {
        localStorage.removeItem('authToken');
        router.push('/auth');
      }, timeout);

      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error decoding token:', error);
      localStorage.removeItem('authToken');
      router.push('/auth');
    }
  }, [router]);

  function getTokenExpiration(token: string): number | null {
    try {
      const decoded: UserInfo = jwtDecode(token);
      return decoded.exp;
    } catch {
      return null;
    }
  }

  function isTokenExpired(token: string): boolean {
    const exp = getTokenExpiration(token);
    if (!exp) return true;
    return exp < Date.now() / 1000;
  }

  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          <p className="mt-4 text-brand-primary-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Student Dashboard (role: "student")
  if (isStudent(userRole)) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50 font-raleway">
        {/* Simple Student Header */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 px-6 py-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                OpenAssess
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-brand-primary-100 font-medium">
                {userInfo?.email}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  router.push('/auth');
                }}
                className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-150 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Student Dashboard Content */}
        <StudentDashboardWrapper 
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>
    );
  }

  // Lecturer Dashboard (role: "staff" or "administrator")
  if (canAccessLecturerDashboard(userRole)) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <LecturerTopBar
          toggleLeftSidebar={toggleLeftSidebar}
          leftSidebarCollapsed={isLeftSidebarCollapsed}
          rightSidebarCollapsed={false}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        <div className={`flex flex-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
          {/* Navigation - Show as bottom bar on mobile, side bar on tablet/desktop */}
          {isMobile ? (
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

  // Unknown role or admin - show error
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Access Error
        </h2>
        <p className="text-gray-600 mb-6">
          Your account role ({getRoleDisplayName(userRole)}) is not supported in this interface.
          Please contact your administrator.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('authToken');
            router.push('/auth');
          }}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
