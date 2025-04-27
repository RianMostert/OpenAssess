"use client"

import { useState } from 'react';
import TopBar from '@/components/top-bar';
import LeftSideBar from '@components/left-sidebar';
import RightSidebar from '@components/right-sidebar';
import PdfAnnotator from '@/components/pdf-annotator';
import NavBar from '@/components/nav-bar';

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const [activeNavItem, setActiveNavItem] = useState('document');

  // Function to handle the left sidebar toggle
  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  }
  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden ">
      <TopBar
        toggleLeftSidebar={toggleLeftSidebar}
        toggleRightSidebar={toggleRightSidebar}
        leftSidebarCollapsed={false}
        rightSidebarCollapsed={false}
      />
      <div className="grid grid-cols-[auto_300px_1fr_300px] h-screen overflow-hidden">

        <div className="flex flex-col border-r border-zinc-800">
          <NavBar activeNavItem="document" itemSelected={setActiveNavItem} />
        </div>

        <div className="border-r border-zinc-800">
          <LeftSideBar activeNavItem="document" width={300} />
        </div>

        <div className="overflow-auto">
          <PdfAnnotator />
        </div>

        <div className="border-l border-zinc-800">
          <RightSidebar width={300} />
        </div>

      </div>


    </div>
  );
}
