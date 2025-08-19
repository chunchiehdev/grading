import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

type ReactPdf = typeof import('react-pdf');

interface FullScreenPdfViewerProps {
  file?: File | null | undefined;
  fileUrl?: string;
  fileName?: string; 
}

export function FullScreenPdfViewer({ file, fileUrl, fileName }: FullScreenPdfViewerProps) {
  const [pdf, setPdf] = useState<ReactPdf | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  console.log("fileUrl", fileUrl);

  useEffect(() => {
    setIsClient(true);
    (async () => {
      const mod = await import('react-pdf');
      mod.pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      setPdf(mod);
    })();
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPageNumber((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPageNumber((p) => Math.min(numPages || 1, p + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);

  }, [isClient, numPages]);

  if (!file && !fileUrl) {
    return <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">無可預覽的檔案</div>;
  }
  if (!pdf || !isClient) {
    return <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading PDF…</div>;
  }

  const Document = pdf.Document as any;
  const Page = pdf.Page as any;

  return (
    <div className="w-full h-full bg-background flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center p-2">
        <div className="w-full h-full flex items-center justify-center">
          <Document
            file={file || fileUrl}
            onLoadSuccess={({ numPages }: { numPages: number }) => {
              setNumPages(numPages);
              setPageNumber(1);
            }}
            loading={<div className="text-muted-foreground">Loading…</div>}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              className="max-w-full max-h-full w-auto h-auto shadow-lg"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>

      {numPages > 0 && (
        <div className="flex-shrink-0 flex items-center justify-center py-3 px-2 border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
            {/* Zoom Controls */}

            {/* Page Navigation */}
            <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-background border border-border shadow-sm">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 transition-colors"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium tabular-nums px-1 min-w-[3rem] text-center">
                {pageNumber} / {numPages}
              </span>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 transition-colors"
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rotation Control */}
            <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-background border border-border shadow-sm">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted transition-colors"
                onClick={() => setRotation(r => (r + 90) % 360)}
                aria-label="Rotate 90 degrees"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}