import MappingPanel from "@components/right-sidebar-panels/MappingPanel";

interface Assessment {
    id: string;
    title: string;
}

interface RightSideBarProps {
    activeMainPanel: string;
    selectedAssessment: { id: string; title: string } | null;
    onSelectAssessment?: (assessment: Assessment) => void;
    width: number;
}

export default function RightSideBar({
    activeMainPanel,
    selectedAssessment,
    onSelectAssessment,
    width,
}: RightSideBarProps) {
    const renderPanel = () => {
        switch (activeMainPanel) {
            case "assessment":
                return (
                    <MappingPanel
                        selectedAssessment={selectedAssessment}
                    />
                );
            default:
                return (
                    <div className="p-4 text-muted-foreground">
                        Select a panel to view its content.
                    </div>
                );
        }
    };

    return (
        <div
            className="border-l border-zinc-800 flex flex-col overflow-hidden"
            style={{ width: `${width}px`, minWidth: `${width}px` }}
        >
            <div className="p-4 flex-1 overflow-auto">{renderPanel()}</div>
        </div>
    );
}