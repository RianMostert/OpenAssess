import { Button } from "@components/ui/button"
import { PanelLeft, PanelRight } from "lucide-react"

interface TopBarProps {
    toggleLeftSidebar: () => void
    toggleRightSidebar: () => void
    leftSidebarCollapsed: boolean
    rightSidebarCollapsed: boolean
}

export default function TopBar({
    toggleLeftSidebar,
    toggleRightSidebar,
    leftSidebarCollapsed,
    rightSidebarCollapsed,
}: TopBarProps) {
    return (
        <div className="flex items-center justify-center p-4 border-b border-zinc-800">
            <div className="absolute left-4">
                <Button
                    variant="outline"
                    size={"icon"}
                    onClick={toggleLeftSidebar}
                    title={leftSidebarCollapsed ? "Show Left Sidebar" : "Hide Left Sidebar"}>
                    <PanelLeft className={`h-5 w-5 ${leftSidebarCollapsed ? "rotate-180" : ""}`} />
                </Button>
            </div>
            <span className="text-lg font-semibold">Assessment Manager</span>
            <div className="absolute right-4">
                <Button
                    variant="outline"
                    size={"icon"}
                    onClick={toggleRightSidebar}
                    title={rightSidebarCollapsed ? "Show Right Sidebar" : "Hide Right Sidebar"}>
                    <PanelRight className={`h-5 w-5 ${rightSidebarCollapsed ? "rotate-180" : ""}`} />
                </Button>
            </div>
        </div>
    )
}