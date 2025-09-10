import { JSX, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, StickyNote, Eraser } from 'lucide-react';
import { Tooltip } from '@radix-ui/react-tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';

type Tool = 'pencil' | 'sticky-note' | 'text-note' | 'eraser' | 'undo' | 'redo';

type Props = {
    tool: Tool | null;
    setTool: (tool: Tool | null) => void;
    onUndo: () => void;
    onRedo: () => void;
};

const toolButtons: { key: Tool; label: string; icon?: JSX.Element }[] = [
    { key: 'pencil', label: 'Pencil', icon: <Pencil className="h-5 w-5" /> },
    { key: 'eraser', label: 'Eraser', icon: <Eraser className="h-5 w-5" /> },
    { key: 'text-note', label: 'Text Note', icon: <StickyNote className="h-5 w-5" /> },
    { key: 'sticky-note', label: 'Sticky Note', icon: <StickyNote className="h-5 w-5" /> },
];

export default function PdfAnnotatorBar({ tool, setTool, onUndo, onRedo }: Props) {
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

    const handleToolChange = (tool: Tool) => {
        const newTool = selectedTool === tool ? null : tool;
        setSelectedTool(newTool);
        setTool(newTool);
    };

    return (
        <TooltipProvider>
            <div className="flex items-center justify-center p-4 border-b border-zinc-800">
                <div className="flex space-x-2">
                    {toolButtons.map(({ key, label, icon }) => (
                        <Tooltip key={key}>
                            <Button
                                variant="outline"
                                onClick={() => handleToolChange(key)}
                                className={`transition-colors duration-150 touch-manipulation min-h-[44px] min-w-[44px] toolbar-button touch-target ${selectedTool === key ? 'border-blue-500 bg-blue-50' : ''}`}
                            >
                                {/* {icon} */}
                                {label}
                            </Button>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
}
