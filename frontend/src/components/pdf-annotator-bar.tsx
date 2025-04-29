import { useState } from 'react';
import { Button } from './ui/button';
import { Highlighter, Pencil, StickyNote, Eraser, Undo2, Redo2, } from 'lucide-react';
import { Tooltip } from '@radix-ui/react-tooltip';
import { TooltipProvider } from './ui/tooltip';

type Tool = 'highlighter' | 'pencil' | 'sticky-note' | 'eraser' | 'undo' | 'redo';
type annotationColour = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'black';


export default function PdfAnnotatorBar() {
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

    const handleToolChange = (tool: Tool) => {
        setSelectedTool(selectedTool === tool ? null : tool);
    }
    return (
        <TooltipProvider>
            <div className="flex items-center justify-center p-4 border-b border-zinc-800">
                <div className="flex space-x-2">
                    <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('highlighter')}>
                            <Highlighter className="h-5 w-5" />
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('pencil')}>
                            <Pencil className="h-5 w-5" />
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('sticky-note')}>
                            <StickyNote className="h-5 w-5" />
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('eraser')}>
                            <Eraser className="h-5 w-5" />
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('undo')}>
                            <Undo2 className="h-5 w-5" />
                        </Button>
                    </Tooltip>
                    <Tooltip>
                        <Button variant="outline" size="icon" onClick={() => handleToolChange('redo')}>
                            <Redo2 className="h-5 w-5" />
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    )
}
