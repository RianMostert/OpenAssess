import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pencil } from "lucide-react";

interface StickyNoteProps {
    content: string;
    onChange: (val: string) => void;
    onClick?: () => void;
    isSelected?: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({
    content,
    onChange,
    onClick,
    isSelected = false,
}) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
        onClick?.(); // optional callback to parent
    };

    return (
        <Card
            onClick={toggleExpand}
            className={`cursor-pointer p-2 transition-all duration-300 ${expanded ? "w-64 h-64" : "w-16 h-16"
                } overflow-hidden bg-yellow-100 shadow-xl rounded-2xl border-2 ${isSelected ? "border-blue-500" : "border-transparent"
                }`}
        >
            {expanded ? (
                <Textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-full resize-none bg-yellow-100 border-none focus:outline-none"
                    autoFocus
                />
            ) : (
                <div className="flex items-center justify-center h-full text-yellow-900">
                    <Pencil />
                </div>
            )}
        </Card>
    );
};

export default StickyNote;
