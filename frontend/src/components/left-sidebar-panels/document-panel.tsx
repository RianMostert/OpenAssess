import { Button } from "@components/ui/button";
import { TooltipProvider } from "@radix-ui/react-tooltip";

interface DocumentPanelProps {
    onUpload: (file: File) => void;
    onExportPdf?: () => void;
    onExportJson?: (annotationJson: string | null) => void;
}

export default function DocumentPanel({ onUpload, onExportJson }: DocumentPanelProps) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === "application/pdf") {
            onUpload(file);
        }
    };

    const handleExportJson = () => {
        alert("Exporting JSON is not implemented yet.");
    };

    return (
        <>
            <h2 className="text-lg font-semibold mb-4">DOCUMENT</h2>
            <TooltipProvider>
                <div className="flex flex-col space-y-2">
                    <Button asChild variant="outline">
                        <label>
                            Upload PDF
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </Button>
                    <Button variant="outline">Export PDF</Button>
                    <Button variant="outline" onClick={handleExportJson}>Export JSON</Button>
                </div>
            </TooltipProvider>
        </>
    );
}
