import { useState, useRef, useEffect } from 'react';
import CreateQuestionFormModel from '@dashboard/course/mapping/CreateQuestionFormModel';
import { 
    pixelsToPercentage, 
    getPageSizeFromComputedStyle,
    validatePercentageCoordinates,
    roundPercentageCoordinates,
    type PixelCoordinates 
} from '@/lib/coordinateUtils';

interface Coordinates {
    x: number;
    y: number;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
}

interface CreateQuestionControllerProps {
    assessmentId: string;
    currentPage: number;
    pageContainerRef: React.RefObject<HTMLDivElement | null>;
    onQuestionCreated?: () => void;
}

export default function CreateQuestionController({
    assessmentId,
    currentPage,
    pageContainerRef,
    onQuestionCreated,
}: CreateQuestionControllerProps) {
    const [drawing, setDrawing] = useState(false);
    const [startCoord, setStartCoord] = useState<Coordinates | null>(null);
    const [previewRect, setPreviewRect] = useState<Rect | null>(null);
    const [finalRect, setFinalRect] = useState<Rect | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [overlayHeight, setOverlayHeight] = useState<number>(0);

    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (pageContainerRef.current) {
            setOverlayHeight(pageContainerRef.current.scrollHeight);
        }
    }, [pageContainerRef, currentPage]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!pageContainerRef.current) return;

        const pageElement = document.querySelector(`#page-${currentPage} .react-pdf__Page`);
        if (!pageElement) return;

        const rect = pageElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setStartCoord({ x, y });
        setDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!drawing || !startCoord || !pageContainerRef.current) return;

        const pageElement = document.querySelector(`#page-${currentPage} .react-pdf__Page`);
        if (!pageElement || !startCoord) return;

        const rect = pageElement.getBoundingClientRect();
        const x2 = e.clientX - rect.left;
        const y2 = e.clientY - rect.top;

        const x = Math.min(startCoord.x, x2);
        const y = Math.min(startCoord.y, y2);
        const width = Math.abs(x2 - startCoord.x);
        const height = Math.abs(y2 - startCoord.y);

        setPreviewRect({
            x,
            y,
            width,
            height,
            pageNumber: currentPage,
        });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!drawing || !previewRect) return;

        // Get the current page size for percentage conversion
        const pageSize = getPageSizeFromComputedStyle(currentPage);
        if (!pageSize) {
            console.error('Could not get page size for percentage conversion');
            setDrawing(false);
            setPreviewRect(null);
            return;
        }

        // Convert pixel coordinates to percentages for storage
        const pixelCoords: PixelCoordinates = {
            x: previewRect.x,
            y: previewRect.y,
            width: previewRect.width,
            height: previewRect.height,
        };

        const percentageCoords = pixelsToPercentage(pixelCoords, pageSize);
        
        // Validate and round the percentage coordinates
        if (!validatePercentageCoordinates(percentageCoords)) {
            console.error('Invalid percentage coordinates:', percentageCoords);
            setDrawing(false);
            setPreviewRect(null);
            return;
        }

        const roundedPercentageCoords = roundPercentageCoordinates(percentageCoords);

        // Store the percentage coordinates for the form
        const rectWithPercentages = {
            ...previewRect,
            x: roundedPercentageCoords.x,
            y: roundedPercentageCoords.y,
            width: roundedPercentageCoords.width,
            height: roundedPercentageCoords.height,
        };

        setFinalRect(previewRect); // Keep pixel coords for display
        setRect(rectWithPercentages); // Use percentage coords for saving
        setPreviewRect(null);
        setDrawing(false);
        setShowModal(true);
    };

    return (
        <>
            <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute top-0 left-0 w-full h-full z-50 cursor-crosshair"
                style={{
                    pointerEvents: showModal ? 'none' : 'auto',
                    height: `${overlayHeight}px`,
                }}
            />

            {previewRect && (
                (() => {
                    // Calculate the offset between page container and PDF page
                    const pageContainer = document.getElementById(`page-${currentPage}`);
                    const pdfPage = document.querySelector(`#page-${currentPage} .react-pdf__Page`);
                    
                    if (pageContainer && pdfPage) {
                        const containerRect = pageContainer.getBoundingClientRect();
                        const pdfRect = pdfPage.getBoundingClientRect();
                        const offsetX = pdfRect.left - containerRect.left;
                        const offsetY = pdfRect.top - containerRect.top;
                        
                        return (
                            <div
                                className="absolute border border-blue-400 z-40 pointer-events-none"
                                style={{
                                    top: previewRect.y + offsetY,
                                    left: previewRect.x + offsetX,
                                    width: previewRect.width,
                                    height: previewRect.height,
                                    transform: 'translateZ(0)',
                                }}
                            />
                        );
                    }
                    return null;
                })()
            )}

            {finalRect && !showModal && (
                (() => {
                    // Calculate the offset between page container and PDF page
                    const pageContainer = document.getElementById(`page-${currentPage}`);
                    const pdfPage = document.querySelector(`#page-${currentPage} .react-pdf__Page`);
                    
                    if (pageContainer && pdfPage) {
                        const containerRect = pageContainer.getBoundingClientRect();
                        const pdfRect = pdfPage.getBoundingClientRect();
                        const offsetX = pdfRect.left - containerRect.left;
                        const offsetY = pdfRect.top - containerRect.top;
                        
                        return (
                            <div
                                className="absolute border border-blue-400 z-40 pointer-events-none"
                                style={{
                                    top: finalRect.y + offsetY,
                                    left: finalRect.x + offsetX,
                                    width: finalRect.width,
                                    height: finalRect.height,
                                    transform: 'translateZ(0)',
                                }}
                            />
                        );
                    }
                    return null;
                })()
            )}

            {rect && showModal && (
                <CreateQuestionFormModel
                    open={showModal}
                    setOpen={(open) => {
                        setShowModal(open);
                        if (!open) {
                            setPreviewRect(null);
                            setFinalRect(null);
                            setRect(null);
                            setDrawing(false);
                        }
                    }}
                    initialData={{
                        assessment_id: assessmentId,
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        page_number: rect.pageNumber,
                    }}
                    onCreated={() => {
                        setRect(null);
                        onQuestionCreated?.();
                        window.dispatchEvent(new Event('question-created'));
                    }}
                />
            )}
        </>
    );
}
