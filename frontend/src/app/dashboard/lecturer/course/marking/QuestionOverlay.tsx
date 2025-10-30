import React, { useState } from 'react';
import { QuestionWithResult } from '@/types/course';

interface QuestionOverlayProps {
    question: QuestionWithResult;
    onMarkChange: (questionId: string, mark: number) => void;
    onCommentChange?: (questionId: string, comment: string) => void;
    pageWidth: number;
    pageHeight: number;
    isSelected?: boolean;
    onSelect?: () => void;
}

export default function QuestionOverlay({
    question,
    onMarkChange,
    onCommentChange,
    pageWidth,
    pageHeight,
    isSelected = false,
    onSelect
}: QuestionOverlayProps) {
    const [showMarkInput, setShowMarkInput] = useState(false);
    const [tempMark, setTempMark] = useState(question.mark?.toString() || '');

    // Calculate absolute position based on page dimensions and question percentages
    const left = (question.x / 100) * pageWidth;
    const top = (question.y / 100) * pageHeight;
    const width = (question.width / 100) * pageWidth;
    const height = (question.height / 100) * pageHeight;

    const handleMarkSubmit = () => {
        const mark = parseFloat(tempMark);
        if (!isNaN(mark) && mark >= 0 && mark <= (question.max_marks || 0)) {
            onMarkChange(question.id, mark);
            setShowMarkInput(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleMarkSubmit();
        } else if (e.key === 'Escape') {
            setTempMark(question.mark?.toString() || '');
            setShowMarkInput(false);
        }
    };

    const currentMark = question.mark ?? 0;
    const maxMark = question.max_marks ?? 0;

    // Use consistent blue styling like question-by-question mode
    const colors = {
        border: 'border-blue-500',
        bg: 'bg-blue-500/10', 
        tag: 'bg-blue-500',
        text: 'text-white'
    };

    return (
        <div
            className={`absolute cursor-pointer transition-all duration-200 ${
                isSelected 
                    ? `border-4 ${colors.border} ${colors.bg} shadow-lg` 
                    : `border-2 ${colors.border} ${colors.bg} hover:shadow-md`
            }`}
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
            }}
            onClick={onSelect}
        >
            {/* Question Label */}
            <div 
                className={`absolute -top-8 left-0 px-2 py-1 rounded text-xs font-medium ${colors.tag} ${colors.text} shadow-sm`}
                style={{ minWidth: '60px' }}
            >
                Q{question.question_number}
            </div>

            {/* Mark Display/Input */}
            <div 
                className={`absolute -top-8 right-0 px-2 py-1 rounded text-xs font-medium ${colors.tag} ${colors.text} shadow-sm cursor-pointer`}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMarkInput(true);
                }}
            >
                {showMarkInput ? (
                    <input
                        type="number"
                        value={tempMark}
                        onChange={(e) => setTempMark(e.target.value)}
                        onBlur={handleMarkSubmit}
                        onKeyDown={handleKeyPress}
                        className="w-12 px-1 text-xs bg-white text-gray-900 border rounded"
                        min="0"
                        max={question.max_marks || 0}
                        step={question.increment || 0.5}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                    />
                ) : (
                    <span>
                        {currentMark}/{maxMark}
                    </span>
                )}
            </div>

            {/* Quick Mark Buttons (only show when selected) */}
            {isSelected && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                    {(() => {
                        const increment = question.increment || 0.5;
                        const fractions = [0, 0.25, 0.5, 0.75, 1];
                        
                        // Calculate unique mark values
                        const markValues = fractions.map(fraction => {
                            const markValue = maxMark * fraction;
                            const roundedValue = Math.round(markValue / increment) * increment;
                            return Math.min(roundedValue, maxMark);
                        });
                        
                        // Remove duplicates while preserving order
                        const uniqueMarkValues = markValues.filter((value, index, array) => 
                            array.findIndex(v => Math.abs(v - value) < 0.01) === index
                        );
                        
                        return uniqueMarkValues.map((finalValue, index) => (
                            <button
                                key={`mark-${finalValue}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkChange(question.id, finalValue);
                                }}
                                className={`px-1 py-0.5 text-xs rounded transition-colors ${
                                    Math.abs((question.mark ?? 0) - finalValue) < 0.01
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                                }`}
                                style={{ fontSize: '10px' }}
                            >
                                {finalValue}
                            </button>
                        ));
                    })()}
                </div>
            )}

            {/* Comment Indicator */}
            {question.comment && (
                <div className="absolute top-1 right-1">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                </div>
            )}
        </div>
    );
}