import { useEffect, useRef, useState } from 'react';
import { questionService, type MappingQuestion } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    pixelsToPercentage, 
    percentageToPixels,
    getPageSizeFromComputedStyle,
    validatePercentageCoordinates,
    roundPercentageCoordinates,
    type PixelCoordinates,
    type PercentageCoordinates 
} from '@/lib/coordinateUtils';

interface EditQuestionControllerProps {
    question: MappingQuestion;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
    onUpdated: () => void;
}

export default function EditQuestionController({
    question,
    pageContainerRef,
    onClose,
    onUpdated,
}: EditQuestionControllerProps) {
    const [drawing, setDrawing] = useState(false);
    const [startCoord, setStartCoord] = useState<{ x: number; y: number } | null>(null);
    
    // Store display coordinates in pixels and data coordinates in percentages
    const [displayRect, setDisplayRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [dataRect, setDataRect] = useState({
        x: question.x,
        y: question.y,
        width: question.width,
        height: question.height,
    });
    
    const [formData, setFormData] = useState({
        question_number: question.question_number,
        max_marks: question.max_marks,
        increment: question.increment,
        memo: question.memo || '',
        marking_note: question.marking_note || '',
    });

    const overlayRef = useRef<HTMLDivElement>(null);
    const [overlayHeight, setOverlayHeight] = useState(0);
    const [loading, setLoading] = useState(false);

    // Convert percentage coordinates to pixels for display
    useEffect(() => {
        const updateDisplayRect = () => {
            const pageSize = getPageSizeFromComputedStyle(question.page_number);
            if (pageSize) {
                const percentageCoords: PercentageCoordinates = {
                    x: question.x,
                    y: question.y,
                    width: question.width,
                    height: question.height,
                };
                const pixelCoords = percentageToPixels(percentageCoords, pageSize);
                setDisplayRect(pixelCoords);
            }
        };

        updateDisplayRect();
        
        // Update display rect when window resizes
        window.addEventListener('resize', updateDisplayRect);
        return () => window.removeEventListener('resize', updateDisplayRect);
    }, [question.page_number, question.x, question.y, question.width, question.height]);

    useEffect(() => {
        if (pageContainerRef.current) {
            setOverlayHeight(pageContainerRef.current.scrollHeight);
        }
    }, [pageContainerRef, question.page_number]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const pageElement = document.querySelector(`#page-${question.page_number} .react-pdf__Page`);
        if (!pageElement) return;
        const bounds = pageElement.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        setStartCoord({ x, y });
        setDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!drawing || !startCoord) return;

        const pageElement = document.querySelector(`#page-${question.page_number} .react-pdf__Page`);
        if (!pageElement) return;
        const bounds = pageElement.getBoundingClientRect();
        const x2 = e.clientX - bounds.left;
        const y2 = e.clientY - bounds.top;

        const x = Math.min(startCoord.x, x2);
        const y = Math.min(startCoord.y, y2);
        const width = Math.abs(x2 - startCoord.x);
        const height = Math.abs(y2 - startCoord.y);
        
        // Update both display rect (pixels) and convert to percentage for data
        setDisplayRect({ x, y, width, height });
        
        // Convert to percentages for data storage
        const pageSize = getPageSizeFromComputedStyle(question.page_number);
        if (pageSize) {
            const pixelCoords: PixelCoordinates = { x, y, width, height };
            const percentageCoords = pixelsToPercentage(pixelCoords, pageSize);
            const roundedPercentageCoords = roundPercentageCoordinates(percentageCoords);
            setDataRect(roundedPercentageCoords);
        }
    };

    const handleMouseUp = () => {
        setDrawing(false);
        setStartCoord(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                x: dataRect.x,
                y: dataRect.y,
                width: dataRect.width,
                height: dataRect.height,
            };

            await questionService.updateQuestion(question.id, payload);
            onUpdated();
            onClose();
            // Dispatch event to notify other components
            window.dispatchEvent(new Event('question-updated'));
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        
        setLoading(true);
        try {
            await questionService.deleteQuestion(question.id);
            onUpdated();
            onClose();
            // Dispatch event to notify other components
            window.dispatchEvent(new Event('question-deleted'));
        } catch (err) {
            console.error('Delete failed', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div
                ref={overlayRef}
                className="absolute top-0 left-0 w-full z-50 cursor-crosshair"
                style={{
                    height: `${overlayHeight}px`,
                    pointerEvents: loading ? 'none' : 'auto',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />

            {/* Draw rectangle */}
            {(() => {
                // Calculate the offset between page container and PDF page
                const pageContainer = document.getElementById(`page-${question.page_number}`);
                const pdfPage = document.querySelector(`#page-${question.page_number} .react-pdf__Page`);
                
                if (pageContainer && pdfPage) {
                    const containerRect = pageContainer.getBoundingClientRect();
                    const pdfRect = pdfPage.getBoundingClientRect();
                    const offsetX = pdfRect.left - containerRect.left;
                    const offsetY = pdfRect.top - containerRect.top;
                    
                    return (
                        <div
                            className="absolute border-2 border-red-500 pointer-events-none z-40"
                            style={{
                                top: displayRect.y + offsetY,
                                left: displayRect.x + offsetX,
                                width: displayRect.width,
                                height: displayRect.height,
                            }}
                        />
                    );
                }
                return (
                    <div
                        className="absolute border-2 border-red-500 pointer-events-none z-40"
                        style={{
                            top: displayRect.y,
                            left: displayRect.x,
                            width: displayRect.width,
                            height: displayRect.height,
                        }}
                    />
                );
            })()}

            {/* Inline form */}
            <div className="fixed bottom-4 right-4 bg-white p-5 rounded-xl shadow-2xl z-50 w-96 space-y-3 border-2 border-brand-accent-400 font-raleway">
                <h3 className="text-lg font-bold text-brand-primary-800 pb-2 border-b-2 border-brand-accent-200">
                    Edit Question
                </h3>
                <Input
                    name="question_number"
                    placeholder="Question Number"
                    value={formData.question_number}
                    onChange={handleChange}
                    className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                />
                <div className="flex gap-2">
                    <Input
                        type="number"
                        name="max_marks"
                        placeholder="Max Marks"
                        value={formData.max_marks || ''}
                        onChange={handleChange}
                        className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                    />
                    <Input
                        type="number"
                        name="increment"
                        placeholder="Increment"
                        value={formData.increment || ''}
                        onChange={handleChange}
                        className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                    />
                </div>
                <Textarea
                    name="memo"
                    placeholder="Memo"
                    value={formData.memo}
                    onChange={handleChange}
                    className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                />
                {/* <Textarea
                    name="marking_note"
                    placeholder="Marking Note"
                    value={formData.marking_note}
                    onChange={handleChange}
                    className="border-2 border-brand-accent-400 focus:border-brand-primary-600 focus:ring-brand-primary-500"
                /> */}
                <div className="flex justify-between gap-2 pt-2">
                    <Button 
                        variant="destructive" 
                        onClick={handleDelete} 
                        disabled={loading}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 font-semibold"
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                    <div className="flex gap-2">
                        <Button 
                            variant="ghost" 
                            onClick={onClose} 
                            disabled={loading}
                            className="text-brand-primary-700 hover:text-brand-primary-800 hover:bg-brand-primary-50 font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className="bg-brand-primary-600 hover:bg-brand-primary-700 text-white font-semibold"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
