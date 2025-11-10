import React, { useRef, useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface TextNoteProps {
    content: string;
    onChange: (val: string) => void;
    onResize?: (width: number, height: number) => void;
    onClick?: () => void;
    isSelected?: boolean;
    width?: number;
    height?: number;
    textColor?: string;
}

const TextNote: React.FC<TextNoteProps> = ({
    content,
    onChange,
    onResize,
    onClick,
    isSelected,
    width,
    height,
    textColor = "#ef4444",
}) => {
    const [editing, setEditing] = useState(false);
    const noteRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (noteRef.current && !noteRef.current.contains(e.target as Node)) {
                setEditing(false);
            }
        };

        if (editing) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [editing]);

    useEffect(() => {
        if (!editing && textareaRef.current && onResize) {
            const { offsetWidth, offsetHeight } = textareaRef.current;
            onResize(offsetWidth, offsetHeight);
        }
    }, [editing]);

    return (
        <div
            ref={noteRef}
            onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                onClick?.();
            }}
            className={`whitespace-pre-wrap break-words ${isSelected ? "outline outline-1 outline-blue-400" : ""
                }`}
            style={{
                cursor: "text",
                width: width || "fit-content",
                height: height || "auto",
                minWidth: 40,
                minHeight: 20,
                color: textColor,
            }}
        >
            {editing ? (
                <Textarea
                    ref={textareaRef}
                    autoFocus
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setEditing(false)}
                    className="w-full h-full resize focus:outline-none bg-transparent border-none p-0 m-0 text-base leading-snug"
                    style={{
                        boxShadow: "none",
                        resize: "both",
                        overflow: "auto",
                        color: textColor,
                    }}
                />
            ) : (
                <div className="text-base leading-snug">
                    {content || <span className="text-gray-400 italic">Click to add text</span>}
                </div>
            )}
        </div>
    );
};

export default TextNote;
