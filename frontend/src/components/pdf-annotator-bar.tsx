import { useState } from 'react';
import { Button } from './ui/button';
import { Highlighter, Pencil, StickyNote, Eraser, Undo2, Redo2, } from 'lucide-react';
import { Tooltip } from '@radix-ui/react-tooltip';
import { TooltipProvider } from './ui/tooltip';

type Tool = 'highlighter' | 'pencil' | 'sticky-note' | 'text-note' | 'eraser' | 'undo' | 'redo';
type annotationColour = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'black';

type Props = ({
    tool: Tool | null;
    setTool: (tool: Tool | null) => void;
    onUndo: () => void;
    onRedo: () => void;
});

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
                    {/* <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('highlighter')}>
                            <Highlighter className="h-5 w-5" />
                        </Button>
                    </Tooltip> */}
                    <Tooltip>
                        <Button
                            className={`transition-colors duration-150 ${selectedTool === 'pencil' ? 'border-blue-500' : ''}`}
                            variant="outline"
                            onClick={() => handleToolChange('pencil')}>
                            {/* <Pencil className="h-5 w-5" /> */}
                            <text>Pencil</text>
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button
                            className={`transition-colors duration-150 ${selectedTool === 'eraser' ? 'border-blue-500' : ''}`}
                            variant="outline"
                            onClick={() => handleToolChange('eraser')}>
                            {/* <Eraser className="h-5 w-5" /> */}
                            <text>Eraser</text>
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button
                            className={`transition-colors duration-150 ${selectedTool === 'text-note' ? 'border-blue-500' : ''}`}
                            variant="outline"
                            onClick={() => handleToolChange('text-note')}>
                            {/* <StickyNote className="h-5 w-5" /> */}
                            <text>Text Note</text>
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button
                            className={`transition-colors duration-150 ${selectedTool === 'sticky-note' ? 'border-blue-500' : ''}`}
                            variant="outline"
                            onClick={() => handleToolChange('sticky-note')}>
                            {/* <StickyNote className="h-5 w-5" /> */}
                            <text>Sticky Note</text>
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button
                            // className={`transition-colors duration-150 ${selectedTool === 'pencil' ? 'border-blue-500' : ''}`}
                            variant="outline"
                            onClick={onUndo} >
                            {/* <Undo2 className="h-5 w-5" /> */}
                            <text>Undo</text>
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button
                            // className={`transition-colors duration-150 ${selectedTool === 'pencil' ? 'border-blue-500' : ''}`}
                            variant="outline"
                            onClick={onRedo}>
                            {/* <Redo2 className="h-5 w-5" /> */}
                            <text>Redo</text>
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    )
}
