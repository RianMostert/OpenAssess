import { Button } from './ui/button';
import { Pencil, Map, Upload, Download, Trash2 } from 'lucide-react';
import { Tooltip } from '@radix-ui/react-tooltip';
import { TooltipProvider } from './ui/tooltip';
import { JSX } from 'react';

type AssessmentAction = 'edit' | 'map' | 'upload' | 'export' | 'delete';

type Props = {
    onAction: (action: AssessmentAction) => void;
    selectedAction?: AssessmentAction | null;
};

const actions: { key: AssessmentAction; label: string; icon: JSX.Element }[] = [
    // { key: 'edit', label: 'Edit', icon: <Pencil className="h-5 w-5" /> },
    { key: 'map', label: 'Map', icon: <Map className="h-5 w-5" /> },
    { key: 'upload', label: 'Upload', icon: <Upload className="h-5 w-5" /> },
    { key: 'export', label: 'Export', icon: <Download className="h-5 w-5" /> },
    // { key: 'delete', label: 'Delete', icon: <Trash2 className="h-5 w-5" /> },
];

export default function AssessmentBar({ onAction, selectedAction = null }: Props) {
    return (
        <TooltipProvider>
            <div className="flex items-center justify-center p-4 border-b border-zinc-800">
                <div className="flex space-x-2">
                    {actions.map(({ key, label, icon }) => (
                        <Tooltip key={key}>
                            <Button
                                variant="outline"
                                onClick={() => onAction(key)}
                                className={`transition-colors duration-150 ${selectedAction === key ? 'border-blue-500' : ''
                                    }`}
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
