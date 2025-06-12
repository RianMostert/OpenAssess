"use client"

import { useState } from 'react';
import TopBar from '@/components/top-bar';
import LeftSideBar from '@components/left-sidebar';
import RightSidebar from '@components/right-sidebar';
// import PdfAnnotator from '@/components/pdf-annotator';
import NavBar from '@/components/nav-bar';
import dynamic from 'next/dynamic';

const PdfAnnotator = dynamic(() => import('../components/pdf-annotator'), {
  ssr: false,
});

interface LineElement {
  id: string;
  tool: 'pencil' | 'eraser';
  points: number[];
  stroke: string;
  strokeWidth: number;
  compositeOperation?: string;
  page: number;
}

interface TextElement {
  id: string;
  tool: 'text-note';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
  page: number;
}

interface StickyNoteElement {
  id: string;
  tool: 'sticky-note';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
  page: number;
}

export default function Home() {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const [activeNavItem, setActiveNavItem] = useState('document');
  const [pdfFile, setPdfFile] = useState<File | string | null>(null);
  const [lines, setLines] = useState<LineElement[]>([]);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteElement[]>([]);

  // Function to handle the left sidebar toggle
  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  }
  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
  }

  const getJson = () => {
    return JSON.stringify({
      lines,
      texts,
      stickyNotes
    }, null, 2);
  }

  const exportAnnotationsToJson = () => {
    const exportData = getJson();

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  const burnAnnotations = async () => {
    if (!pdfFile || typeof pdfFile === "string") {
      alert("Please upload a valid PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdfFile); // PDF file
    formData.append("annotation_json", getJson()); // JSON string

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/annotations/burn`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to burn annotations on PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfFile.name}`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error during annotation burn:", error);
      alert("Something went wrong while exporting the PDF.");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden ">
      <TopBar
        toggleLeftSidebar={toggleLeftSidebar}
        toggleRightSidebar={toggleRightSidebar}
        leftSidebarCollapsed={isLeftSidebarCollapsed}
        rightSidebarCollapsed={isRightSidebarCollapsed}
      />
      <div
        className={`grid h-screen overflow-hidden ${isLeftSidebarCollapsed && isRightSidebarCollapsed
          ? 'grid-cols-[auto_1fr]'
          : isLeftSidebarCollapsed
            ? 'grid-cols-[auto_1fr_300px]'
            : isRightSidebarCollapsed
              ? 'grid-cols-[auto_300px_1fr]'
              : 'grid-cols-[auto_300px_1fr_300px]'
          }`}
      >

        <div className="flex flex-col border-r border-zinc-800">
          <NavBar activeNavItem="document" itemSelected={setActiveNavItem} />
        </div>

        {!isLeftSidebarCollapsed && (
          <div className="border-r border-zinc-800">
            <LeftSideBar
              activeNavItem={activeNavItem}
              width={300}
              onUploadPdf={setPdfFile}
              onExportPdf={burnAnnotations}
              onExportJson={exportAnnotationsToJson}
            />
          </div>
        )}


        <div className="overflow-hidden">
          <PdfAnnotator
            file={pdfFile}
            lines={lines}
            setLines={setLines}
            texts={texts}
            setTexts={setTexts}
            stickyNotes={stickyNotes}
            setStickyNotes={setStickyNotes}
          />

        </div>

        {!isRightSidebarCollapsed && (
          <div className="border-l border-zinc-800">
            <RightSidebar width={300} />
          </div>
        )}


      </div>

    </div>
  );
}
