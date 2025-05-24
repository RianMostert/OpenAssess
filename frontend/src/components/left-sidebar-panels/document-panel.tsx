import { Button } from "@components/ui/button";
import { TooltipProvider } from "@radix-ui/react-tooltip";

interface DocumentPanelProps {
    onUpload: (file: File) => void;
}

export default function DocumentPanel({ onUpload }: DocumentPanelProps) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === "application/pdf") {
            onUpload(file);
        }
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
                    <Button variant="outline">Export JSON</Button>
                </div>
            </TooltipProvider>
        </>
    );
}
