import AssessmentMainPanel from "@components/AssessmentMainPanel";

interface MainPanelProps {
    activeMainPanel?: string;
    selectedAssessment?: {
        id: string;
        title: string;
    } | null;
}

export default function MainPanel({
    activeMainPanel,
    selectedAssessment,
}: MainPanelProps) {
    const renderPanel = () => {
        switch (activeMainPanel) {
            case "assessment":
                return <AssessmentMainPanel selectedAssessment={selectedAssessment} />;
            case "pdf-annotator":
                return (
                    <div className="flex items-center justify-center h-full">
                        PDF Annotator (coming soon)
                    </div>
                );
            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        Select a panel
                    </div>
                );
        }
    };

    return renderPanel();
}
