// app/components/pdf/PDFViewerWithNavigation.tsx
import { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PDFTextHighlighter, type HighlightOptions } from '@/utils/pdf-text-highlighter';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Type definitions for react-pdf components since we're importing them dynamically
type ReactPdfModule = typeof import('react-pdf');

export interface PageMarker {
  pageNumber: number;
  feedbacks: Array<{
    id: string;
    criteriaName: string;
    feedback: string;
    score: number;
    quote?: string;
  }>;
}

export interface PDFViewerHandle {
  jumpToPage: (pageNumber: number) => void;
  flashPage: () => void;
  highlightText: (options: HighlightOptions) => boolean;
  clearHighlights: () => void;
  removeHighlight: (highlightId: string) => void;
}

interface PDFViewerWithNavigationProps {
  fileUrl: string;
  fileName?: string;
  pageMarkers?: PageMarker[];
  onMarkerClick?: (pageNumber: number, feedbacks: PageMarker['feedbacks']) => void;
}

export const PDFViewerWithNavigation = forwardRef<PDFViewerHandle, PDFViewerWithNavigationProps>(
  ({ fileUrl, fileName, pageMarkers = [], onMarkerClick }, ref) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [error, setError] = useState<string | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);

    // State for dynamic imports
    const [pdfModule, setPdfModule] = useState<ReactPdfModule | null>(null);
    const [isClient, setIsClient] = useState(false);

    // PDF text highlighter instance
    const highlighterRef = useRef<PDFTextHighlighter>(new PDFTextHighlighter());

    // Container ref for dynamic width calculation
    const containerRef = useRef<HTMLDivElement>(null);
    // Start with 0 to prevent initial giant PDF that breaks Flexbox centering
    const [containerWidth, setContainerWidth] = useState<number>(0);

    // Initialize PDF.js worker dynamically on client side
    useEffect(() => {
      setIsClient(true);

      const loadPdf = async () => {
        try {
          const loadedModule = await import('react-pdf');
          loadedModule.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
          setPdfModule(loadedModule);
        } catch (err) {
          console.error('Failed to load react-pdf:', err);
          setError('無法載入 PDF 檢視器組件');
        }
      };

      loadPdf();
    }, []);

    // Measure container width for responsive PDF sizing
    useEffect(() => {
      if (!containerRef.current || !isClient) return;

      const updateWidth = (entries?: ResizeObserverEntry[]) => {
        if (!containerRef.current) return;

        let width: number;

        if (entries && entries.length > 0) {
          width = entries[0].contentRect.width;
        } else {
          width = containerRef.current.getBoundingClientRect().width;
        }

        const computedStyle = window.getComputedStyle(containerRef.current);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;

        const availableWidth = width - paddingLeft - paddingRight;
        const pdfWidth = Math.floor(availableWidth * 0.96);

        setContainerWidth((prev) => {
          if (prev === pdfWidth) return prev;
          return pdfWidth;
        });
      };

      updateWidth();
      
      let resizeTimer: NodeJS.Timeout;

      const resizeObserver = new ResizeObserver((entries) => {
        clearTimeout(resizeTimer);
        
        resizeTimer = setTimeout(() => {
          updateWidth(entries);
        }, 200);
      });

      resizeObserver.observe(containerRef.current);
      
      
      return () => {
        resizeObserver.disconnect();
        clearTimeout(resizeTimer); 
      };
    }, [isClient, pdfModule]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      jumpToPage: (page: number) => {
        if (page >= 1 && page <= numPages) {
          setPageNumber(page);
        }
      },
      flashPage: () => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 1500);
      },
      highlightText: (options: HighlightOptions) => {
        // Get the current page's TextLayer
        const textLayer = document.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) {
          console.warn('TextLayer not found, cannot highlight text');
          return false;
        }

        return highlighterRef.current.highlightText(textLayer as HTMLElement, options);
      },
      clearHighlights: () => {
        highlighterRef.current.clearAllHighlights();
      },
      removeHighlight: (highlightId: string) => {
        highlighterRef.current.removeHighlight(highlightId);
      },
    }));

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
      setError(null);
    }, []);

    const onDocumentLoadError = useCallback((error: Error) => {
      console.error('PDF Load Error:', error);
      setError('無法載入 PDF 檔案，請稍後再試。');
    }, []);

    const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
    const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

    // Get markers for current page
    const currentPageMarkers = pageMarkers.filter((m) => m.pageNumber === pageNumber);
    const totalFeedbacks = currentPageMarkers.reduce((sum, m) => sum + m.feedbacks.length, 0);
    
    if (error) {
      return (
        <div className="overflow-hidden h-full flex items-center justify-center bg-card">
          <div className="text-center p-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" size="sm" asChild>
              <a href={fileUrl} download={fileName}>
                <Download className="w-4 h-4 mr-2" />
              </a>
            </Button>
          </div>
        </div>
      );
    }

    // Show loading state while PDF module is loading
    if (!isClient || !pdfModule) {
      return (
        <div className="overflow-hidden min-h-[500px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">載入 PDF 檢視器...</p>
          </div>
        </div>
      );
    }

    // Extract components from loaded module
    const { Document, Page } = pdfModule;

    return (
      <div className="flex flex-col h-full bg-card">
        {/* Toolbar - Responsive */}
        <div className="sticky top-0 z-20 bg-card border-b flex items-center justify-between px-2 md:px-4 py-2 gap-1 md:gap-2 shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs md:text-sm font-medium min-w-[60px] md:min-w-[80px] text-center">
              {pageNumber} / {numPages}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom Controls - Hidden on mobile */}
          <div className="hidden md:flex items-center ">
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Download Button - Icon only on mobile */}
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>

        {/* PDF Content - Allow horizontal scroll when zoomed */}
        <div
          ref={containerRef}
          className="flex-1 w-full min-w-0 overflow-x-auto overflow-y-auto bg-muted/30 p-2 md:p-4"
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
            className="mx-auto w-full"
          >
            <div className="relative mx-auto w-fit">
              {/* PDF Page with width-based responsive sizing */}
              {/* Only render when containerWidth is measured to prevent initial giant PDF */}
              {containerWidth > 0 && (
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth * scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className={`shadow-lg transition-all duration-300 ${
                    isFlashing ? 'ring-4 ring-orange-500 ring-opacity-60 animate-pulse' : ''
                  }`}
                />
              )}
            </div>
          </Document>
        </div>
      </div>
    );
  }
);

PDFViewerWithNavigation.displayName = 'PDFViewerWithNavigation';
