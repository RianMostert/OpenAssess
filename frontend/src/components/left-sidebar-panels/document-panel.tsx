import { Button } from "@components/ui/button";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { on } from "events";

interface DocumentPanelProps {
    onUpload: (file: File) => void;
    onExportPdf: () => void;
    onExportJson: () => void;
}

export default function DocumentPanel({ onUpload, onExportPdf, onExportJson }: DocumentPanelProps) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === "application/pdf") {
            onUpload(file);
        }
    };

    const handleExportJson = () => {
        onExportJson();
    };

    const handlePdfExport = () => {
        onExportPdf();
    };

    // const downloadJson = () => {
    //     const json = getExportJson();
    //     const blob = new Blob([json], { type: 'application/json' });
    //     const url = URL.createObjectURL(blob);

    //     const a = document.createElement('a');
    //     a.href = url;
    //     a.download = 'annotations.json';
    //     a.click();

    //     URL.revokeObjectURL(url);
    //   };


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
                    <Button variant="outline" onClick={handlePdfExport}>Export PDF</Button>
                    <Button variant="outline" onClick={handleExportJson}>Export JSON</Button>
                </div>
            </TooltipProvider>
        </>
    );
}
