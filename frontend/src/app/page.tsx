'use client';

import { useState, useEffect, act } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/app/dashboard/TopBar';
import NavBar from '@/app/dashboard/NavBar';
import CourseView from '@dashboard/course/CourseView';
import ProfileView from '@dashboard/profile/ProfileView';
import { jwtDecode } from 'jwt-decode';
import { useScreenSize } from '@/hooks/use-mobile';

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('courses');

  // Screen size detection
  const { isMobile, isTablet, isDesktop } = useScreenSize();

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setIsLeftSidebarCollapsed(true);
    } else if (isDesktop) {
      setIsLeftSidebarCollapsed(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token || isTokenExpired(token)) {
      localStorage.removeItem('authToken');
      router.push('/auth');
      return;
    }

    setIsAuthenticated(true);

    const exp = getTokenExpiration(token);
    const timeout = exp ? (exp * 1000 - Date.now()) : 0;

    const timer = setTimeout(() => {
      localStorage.removeItem('authToken');
      router.push('/auth');
    }, timeout);

    return () => clearTimeout(timer);
  }, [router]);



  function getTokenExpiration(token: string): number | null {
    try {
      const decoded: { exp: number } = jwtDecode(token);
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
  }
  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
  }

  if (isAuthenticated === null) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        toggleLeftSidebar={toggleLeftSidebar}
        toggleRightSidebar={toggleRightSidebar}
        leftSidebarCollapsed={isLeftSidebarCollapsed}
        rightSidebarCollapsed={isRightSidebarCollapsed}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className={`flex flex-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* Navigation - Show as bottom bar on mobile, side bar on tablet/desktop */}
        {isMobile ? (
          <div className="order-2 border-t border-zinc-800">
            <NavBar 
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
            <NavBar 
              activeNavItem={activeNavItem} 
              itemSelected={setActiveNavItem}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          </div>
        )}

        {/* Main content area */}
        <div className={`flex-1 ${isMobile ? 'order-1' : ''}`}>
          {activeNavItem === 'courses' && (
            <CourseView 
              onToggleCollapse={toggleLeftSidebar} 
              isCollapsed={isLeftSidebarCollapsed}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          )}
          {activeNavItem === 'profile' && (
            <ProfileView 
              isMobile={isMobile}
              isTablet={isTablet}
            />
          )}
        </div>
      </div>
    </div>
  );
}
