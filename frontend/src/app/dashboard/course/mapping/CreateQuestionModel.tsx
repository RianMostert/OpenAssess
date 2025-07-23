import { useState, useRef, useEffect } from 'react';
import CreateQuestionFormModel from '@dashboard/course/mapping/CreateQuestionFormModel';

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

        const pageElement = document.getElementById(`page-${currentPage}`);
        if (!pageElement) return;

        const rect = pageElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setStartCoord({ x, y });
        setDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!drawing || !startCoord || !pageContainerRef.current) return;

        const pageElement = document.getElementById(`page-${currentPage}`);
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

        setFinalRect(previewRect);
        setRect(previewRect)
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
                <div
                    className="absolute border border-blue-400 z-40 pointer-events-none"
                    style={{
                        top: previewRect.y,
                        left: previewRect.x,
                        width: previewRect.width,
                        height: previewRect.height,
                    }}
                />
            )}

            {finalRect && !showModal && (
                <div
                    className="absolute border border-blue-400 z-40 pointer-events-none"
                    style={{
                        top: finalRect.y,
                        left: finalRect.x,
                        width: finalRect.width,
                        height: finalRect.height,
                    }}
                />
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
