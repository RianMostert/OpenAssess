import DocumentPanel from "@/components/left-sidebar-panels/document-panel"
import SettingsPanel from "@/components/left-sidebar-panels/settings-panel"

interface LeftSidebarProps {
    activeNavItem: string;
    width: number;
    onUploadPdf: (file: File) => void;
}

export default function LeftSidebar({ activeNavItem, width, onUploadPdf }: LeftSidebarProps) {
    const renderPanel = () => {
        switch (activeNavItem) {
            case "document":
                return <DocumentPanel onUpload={onUploadPdf} />
            case "settings":
                return <SettingsPanel />
            default:
                return <DocumentPanel onUpload={onUploadPdf} />
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
