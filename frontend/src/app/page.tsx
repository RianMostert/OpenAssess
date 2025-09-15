'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useScreenSize } from '@/hooks/use-mobile';

// Import Lecturer Components
import LecturerTopBar from '@/app/dashboard/lecturer/TopBar';
import LecturerNavBar from '@/app/dashboard/lecturer/NavBar';
import CourseView from '@dashboard/lecturer/course/CourseView';
import LecturerProfileView from '@dashboard/lecturer/profile/ProfileView';

// Import Student Components
import StudentDashboard from '@/app/dashboard/student/StudentDashboard';

interface DecodedToken {
  sub: string;
  exp: number;
  primary_role_id?: number;
  email?: string;
}

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('courses');
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);

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
      const decoded: DecodedToken = jwtDecode(token);
      setUserInfo(decoded);
      setUserRole(decoded.primary_role_id || null);
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
      const decoded: DecodedToken = jwtDecode(token);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Student Dashboard (role_id: 3)
  if (userRole === 3) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        {/* Simple Student Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Assessment Portal
              </h1>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Student
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {userInfo?.email}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  router.push('/auth');
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Student Dashboard Content */}
        <StudentDashboard 
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>
    );
  }

  // Lecturer Dashboard (role_id: 1 = teacher, role_id: 2 = ta)
  if (userRole === 1 || userRole === 2) {
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
          <div className={`flex-1 min-h-0 ${isMobile ? 'order-1' : ''}`}>
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
          Your account role ({userRole || 'unknown'}) is not supported in this interface.
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
