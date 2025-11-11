import { JSX, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, StickyNote, Eraser, Undo, Redo } from 'lucide-react';
import { Tooltip } from '@radix-ui/react-tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';

type Tool = 'pencil' | 'sticky-note' | 'text-note' | 'eraser' | 'fine-eraser' | 'undo' | 'redo';

type Props = {
    tool: Tool | null;
    setTool: (tool: Tool | null) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
};

const toolButtons: { key: Tool; label: string; icon?: JSX.Element }[] = [
    { key: 'pencil', label: 'Pencil', icon: <Pencil className="h-5 w-5" /> },
    { key: 'eraser', label: 'Eraser', icon: <Eraser className="h-5 w-5" /> },
    { key: 'fine-eraser', label: 'Fine Eraser', icon: <Eraser className="h-4 w-4" /> },
    { key: 'text-note', label: 'Text Note', icon: <StickyNote className="h-5 w-5" /> },
    { key: 'sticky-note', label: 'Sticky Note', icon: <StickyNote className="h-5 w-5" /> },
];

export default function PdfAnnotatorBar({ tool, setTool, onUndo, onRedo, canUndo = false, canRedo = false }: Props) {
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

    const handleToolChange = (tool: Tool) => {
        const newTool = selectedTool === tool ? null : tool;
        setSelectedTool(newTool);
        setTool(newTool);
    };

    return (
        <TooltipProvider>
            <div className="flex items-center justify-center py-2 px-4 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 font-raleway border-2 border-brand-accent-400 rounded-lg">
                <div className="flex space-x-2">
                    {toolButtons.map(({ key, label, icon }) => (
                        <Tooltip key={key}>
                            <Button
                                variant="outline"
                                onClick={() => handleToolChange(key)}
                                className={`transition-colors duration-150 touch-manipulation min-h-[36px] px-3 py-1 text-sm font-semibold border-2 border-brand-accent-400 ${
                                    selectedTool === key 
                                        ? 'border-brand-primary-600 bg-brand-primary-600 text-white hover:bg-brand-primary-700' 
                                        : 'text-brand-primary-700 hover:bg-brand-primary-50 bg-white'
                                }`}
                            >
                                {/* {icon} */}
                                {label}
                            </Button>
                        </Tooltip>
                    ))}
                    
                    {/* Separator */}
                    <div className="border-l-2 border-brand-accent-400 mx-2" />
                    
                    {/* Undo/Redo buttons - action buttons, not toggles */}
                    <Button
                        variant="outline"
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="transition-colors duration-150 touch-manipulation min-h-[36px] px-3 py-1 text-sm font-semibold border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Undo className="h-5 w-5 mr-1" />
                        Undo
                    </Button>
                    
                    <Button
                        variant="outline"
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="transition-colors duration-150 touch-manipulation min-h-[36px] px-3 py-1 text-sm font-semibold border-2 border-brand-accent-400 text-brand-primary-700 hover:bg-brand-primary-50 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Redo className="h-5 w-5 mr-1" />
                        Redo
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}
