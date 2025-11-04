import React, { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pencil } from "lucide-react";

interface StickyNoteProps {
    content: string;
    onChange: (val: string) => void;
    onClick?: () => void;
    isSelected?: boolean;
    scaleFactor?: number; // New prop for scaling
    fontSize?: number; // New prop for scaled font size
}

const StickyNote: React.FC<StickyNoteProps> = ({
    content,
    onChange,
    onClick,
    isSelected = false,
    scaleFactor = 0.5,
    fontSize = 14,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [expandToLeft, setExpandToLeft] = useState(false);
    const noteRef = useRef<HTMLDivElement>(null);

    // Calculate scaled dimensions
    const collapsedSize = Math.max(24, 40 * scaleFactor); // Minimum 24px, scaled from base 40px
    const expandedWidth = Math.max(150, 256 * scaleFactor); // Minimum 150px, scaled from base 256px
    const expandedHeight = Math.max(150, 256 * scaleFactor);

    // Detect clicks outside the sticky note
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent | PointerEvent) => {
            if (noteRef.current && !noteRef.current.contains(event.target as Node)) {
                setExpanded(false);
            }
        };

        if (expanded) {
            document.addEventListener("pointerdown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [expanded]);

    const toggleExpand = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (!expanded) {
            if (noteRef.current) {
                const rect = noteRef.current.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const spaceOnRight = viewportWidth - rect.right;
                
                setExpandToLeft(spaceOnRight < expandedWidth);
            }
            setExpanded(true);
            onClick?.();
        }
    };

    return (
        <Card
            ref={noteRef}
            onClick={toggleExpand}
            className={`cursor-pointer p-2 transition-all duration-300 overflow-hidden bg-yellow-100 shadow-xl rounded-2xl border-2 ${isSelected ? "border-blue-500" : "border-transparent"
                }`}
            style={{
                width: expanded ? `${expandedWidth}px` : `${collapsedSize}px`,
                height: expanded ? `${expandedHeight}px` : `${collapsedSize}px`,
                transformOrigin: expandToLeft ? 'top right' : 'top left',
                position: 'relative',
                ...(expanded && expandToLeft ? {
                    transform: `translateX(${collapsedSize - expandedWidth}px)`,
                } : {}),
            }}
        >
            {expanded ? (
                <Textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onTouchStart={(e) => e.stopPropagation()}
                    onBlur={() => setExpanded(false)}
                    className="w-full h-full resize-none bg-yellow-100 border-none focus:outline-none"
                    style={{ fontSize: `${fontSize}px` }}
                    autoFocus
                />
            ) : (
                <div className="flex items-center justify-center h-full text-yellow-900">
                    <Pencil size={Math.max(12, 16 * scaleFactor)} />
                </div>
            )}
        </Card>
    );
};

export default StickyNote;
