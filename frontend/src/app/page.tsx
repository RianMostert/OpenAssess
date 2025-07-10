'use client';

import { useState, useEffect, act } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/app/dashboard/TopBar';
import NavBar from '@/app/dashboard/NavBar';
import CourseView from '@dashboard/course/CourseView';
// import SettingsView from '@/pages/SettingsView';
// import ProfileView from '@/pages/ProfileView';
import { jwtDecode } from 'jwt-decode';

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const [activeNavItem, setActiveNavItem] = useState('courses');

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

  // Function to handle the left sidebar toggle
  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  }
  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
  }

  if (isAuthenticated === null) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden ">
      <TopBar
        toggleLeftSidebar={toggleLeftSidebar}
        toggleRightSidebar={toggleRightSidebar}
        leftSidebarCollapsed={isLeftSidebarCollapsed}
        rightSidebarCollapsed={isRightSidebarCollapsed}
      />

      <div className="grid flex-1 grid-cols-[auto_1fr]">
        <div className="flex flex-col border-r border-zinc-800">
          <NavBar activeNavItem={activeNavItem} itemSelected={setActiveNavItem} />
        </div>

        {activeNavItem === 'courses' && <CourseView />}
        {/* {activeNavItem === 'settings' && <SettingsView />}
          {activeNavItem === 'profile' && <ProfileView />} */}
      </div>
    </div>
    // </div >
  );
}
