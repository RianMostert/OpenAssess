import React, { useEffect, useRef } from 'react';
import dynamic from "next/dynamic";
import { Document, Page, pdfjs } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

export default function PdfAnnotator() {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = React.useState<number | null>(null);
    const [pageNumber, setPageNumber] = React.useState(1);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    useEffect(() => {
        if (pdfRef.current) {
            pdfRef.current.scrollTop = 0;
        }
    }, []);

    return (
        <div className="flex flex-col h-full overflow-hidden items-center-justify-center">
            <div className="flex-1 items-center-justify-center" ref={pdfRef}>
                <Document
                    file="rw244.pdf"
                    onLoadSuccess={onDocumentLoadSuccess}
                >
                    <Page pageNumber={pageNumber} />
                </Document>
            </div>
        </div>
    );
}
