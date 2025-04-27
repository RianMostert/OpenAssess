"use client"

import DocumentPanel from "@/components/left-sidebar-panels/document-panel"

interface LeftSidebarProps {
    activeNavItem: string
    width: number
}

export default function LeftSidebar({ activeNavItem, width }: LeftSidebarProps) {
    const renderPanel = () => {
        switch (activeNavItem) {
            case "document":
                return <DocumentPanel />
            default:
                return <DocumentPanel />
        }
    }

    return (
        <div
            className="border-r border-zinc-800 flex flex-col overflow-hidden"
            style={{ width: `${width}px`, minWidth: `${width}px` }}
        >
            <div className="p-4 flex-1 overflow-auto">{renderPanel()}</div>
        </div>
    )
}
