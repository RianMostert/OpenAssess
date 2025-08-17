import { Button } from "@components/ui/button"
import { PanelLeft, PanelRight, Menu } from "lucide-react"

interface TopBarProps {
    toggleLeftSidebar: () => void
    toggleRightSidebar: () => void
    leftSidebarCollapsed: boolean
    rightSidebarCollapsed: boolean
    isMobile?: boolean
    isTablet?: boolean
}

export default function TopBar({
    toggleLeftSidebar,
    toggleRightSidebar,
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    isMobile = false,
    isTablet = false,
}: TopBarProps) {
    return (
        <div className={`flex items-center justify-center border-b border-zinc-800 ${
            isMobile ? 'p-3' : 'p-4'
        }`}>
            {/* Only show hamburger menu on tablet/desktop, mobile uses bottom navigation */}
            {!isMobile && (
                <div className="absolute left-4">
                    <Button
                        variant="outline"
                        size={isMobile ? "sm" : "icon"}
                        onClick={toggleLeftSidebar}
                        title={leftSidebarCollapsed ? "Show Left Sidebar" : "Hide Left Sidebar"}>
                        {isMobile ? <Menu className="h-4 w-4" /> : <PanelLeft className={`h-5 w-5 ${leftSidebarCollapsed ? "rotate-180" : ""}`} />}
                    </Button>
                </div>
            )}
            <span className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                Assessment Manager
            </span>
            {/* <div className="absolute right-4">
                <Button
                    variant="outline"
                    size={"icon"}
                    onClick={toggleRightSidebar}
                    title={rightSidebarCollapsed ? "Show Right Sidebar" : "Hide Right Sidebar"}>
                    <PanelRight className={`h-5 w-5 ${rightSidebarCollapsed ? "rotate-180" : ""}`} />
                </Button>
            </div> */}
        </div>
    )
}