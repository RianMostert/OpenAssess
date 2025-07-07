import SettingsPanel from "@/components/left-sidebar-panels/settings-panel";
import CoursePanel from "@components/left-sidebar-panels/CoursePanel";
import UserPanel from "@components/left-sidebar-panels/UserPanel";

interface Assessment {
    id: string;
    title: string;
}

interface LeftSidebarProps {
    activeNavItem: string;
    width: number;
    selectedAssessment?: Assessment | null;
    onSelectAssessment?: (assessment: Assessment) => void;
    onSelectPanel?: (panel: string) => void;
}

export default function LeftSidebar({
    activeNavItem,
    width,
    selectedAssessment,
    onSelectAssessment,
}: LeftSidebarProps) {
    const renderPanel = () => {
        switch (activeNavItem) {
            case "course":
                return (
                    <CoursePanel
                        selectedAssessment={selectedAssessment}
                        onSelectAssessment={onSelectAssessment}
                        assessments={[]}
                        setAssessments={() => { }}
                    />
                );
            case "profile":
                return <UserPanel />;
            case "settings":
                return <SettingsPanel />;
            default:
                return (
                    <CoursePanel
                        selectedAssessment={selectedAssessment}
                        onSelectAssessment={onSelectAssessment}
                        assessments={[]}
                        setAssessments={() => { }}
                    />
                );
        }
    };

    return (
        <div
            className="border-r border-zinc-800 flex flex-col overflow-hidden"
            style={{ width: `${width}px`, minWidth: `${width}px` }}
        >
            <div className="p-4 flex-1 overflow-auto">{renderPanel()}</div>
        </div>
    );
}
