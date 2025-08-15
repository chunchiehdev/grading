import { useEffect, useRef, useState } from 'react';
import { FileText, FileType, PanelLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilePreviewInfo {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

function formatSize(size?: number) {
  if (!size && size !== 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePreview({ file, localFile, isFullScreen = false }: { file?: FilePreviewInfo; localFile?: File | null; isFullScreen?: boolean }) {
  const isPdf = (localFile?.type || file?.mimeType) === 'application/pdf';

  return (
    <div className="h-full flex flex-col">
      {/* Filename above */}
      <div className="text-sm font-medium truncate mb-2 shrink-0" title={file?.fileName}>
        {file?.fileName || '尚未選擇檔案'}
      </div>
      
      {/* Preview area - flex-1 with min-h-0 for proper flex behavior */}
      <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
        {isPdf && localFile ? (
          <ClientPdfViewer file={localFile} isFullScreen={isFullScreen} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground gap-2">
            {isPdf ? <FileText className="w-5 h-5" /> : <FileType className="w-5 h-5" />}
            <span className="text-sm">{isPdf ? '選擇的 PDF 將顯示在此處' : '目前僅支援 PDF 預覽'}</span>
          </div>
        )}
      </div>
      
      {/* File info - shrink-0 to prevent compression */}
      <div className="text-xs text-muted-foreground mt-2 shrink-0">
        {(file?.mimeType || '-')}{file?.fileSize ? ` • ${formatSize(file?.fileSize)}` : ''}
      </div>
    </div>
  );
}

function ClientPdfViewer({ file, isFullScreen = false }: { file: File; isFullScreen?: boolean }) {
  const [mod, setMod] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rafRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Load react-pdf module
  useEffect(() => {
    setIsClient(true);
    (async () => {
      try {
        const m = await import('react-pdf');
        m.pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        setMod(m);
      } catch (e) {
        console.error('Failed to load react-pdf:', e);
      }
    })();
  }, []);

  // Track current page based on scroll position
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        let bestIdx = 0;
        let bestDist = Infinity;
        pagesRef.current.forEach((el, idx) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const dist = Math.abs(r.top - rect.top);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });
        setCurrentPage(bestIdx + 1);
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [numPages]);

  // Keyboard navigation in full screen
  useEffect(() => {
    if (!isFullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToPage(Math.min(currentPage + 1, numPages));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPage(Math.max(currentPage - 1, 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullScreen, currentPage, numPages]);

  if (!isClient || !mod) {
    return <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading PDF…</div>;
  }

  const Document = mod.Document as any;
  const Page = mod.Page as any;

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const scrollToPage = (index: number) => {
    const el = pagesRef.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages || 1));
    scrollToPage(clamped - 1);
  };

  // Self-sizing page component with container width detection
  function LazyPage({ pageNumber }: { pageNumber: number }) {
    const [visible, setVisible] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const ref = useRef<HTMLDivElement | null>(null);
    const pageRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
      const node = ref.current;
      if (!node) return;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setVisible(true);
        }
      }, { root: contentRef.current, threshold: 0.01 });
      io.observe(node);
      return () => io.disconnect();
    }, []);

    // Measure container width
    useEffect(() => {
      if (!contentRef.current) return;
      
      const updateWidth = () => {
        const rect = contentRef.current?.getBoundingClientRect();
        if (rect) {
          // 減去 padding (px-4 = 32px)
          setContainerWidth(rect.width - 32);
        }
      };
      
      updateWidth();
      const ro = new ResizeObserver(updateWidth);
      ro.observe(contentRef.current);
      return () => ro.disconnect();
    }, []);

    return (
      <div 
        ref={(el) => { 
          ref.current = el; 
          pagesRef.current[pageNumber - 1] = el; 
        }} 
        className="mb-4 last:mb-0 flex justify-center w-full"
      >
        {visible ? (
          <div ref={pageRef} className="flex justify-center">
            <Page
              pageNumber={pageNumber}
              width={containerWidth > 0 ? Math.min(containerWidth, 800) : undefined}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-md"
              loading={<div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">Loading page…</div>}
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-muted/30 animate-pulse rounded max-w-2xl" />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">

      {/* Toolbar (hidden in full-screen) */}
      {!isFullScreen && (
        <div className="flex items-center justify-between border-b px-2 py-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            title={isSidebarOpen ? '隱藏縮圖' : '顯示縮圖'}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <PanelLeft className="w-4 h-4" />
            {isSidebarOpen ? '隱藏縮圖' : '顯示縮圖'}
          </button>
        </div>
      )}

      <Document
        file={file}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}
      >
        {/* Main container with flex layout */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Sidebar (hidden in full-screen) */}
          {!isFullScreen && (
            <AnimatePresence initial={false}>
              {isSidebarOpen && (
                <motion.div
                  key="thumbs"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 160, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'tween', duration: 0.2 }}
                  className="h-full shrink-0 border-r overflow-y-auto bg-background"
                >
                  <div className="p-2 space-y-2">
                    {numPages > 0 && (
                      Array.from({ length: numPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => scrollToPage(i)}
                          className="w-full rounded border hover:bg-muted/50 p-1 text-xs text-muted-foreground text-left"
                          title={`第 ${i + 1} 頁`}
                        >
                          <LazyThumbPage Page={Page} pageNumber={i + 1} />
                          <div className="mt-1 text-center">{i + 1}</div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Content area - flex-1 with proper overflow */}
          <div
            ref={contentRef}
            className="relative flex-1 min-h-0 overflow-y-auto px-4 py-2"
            onMouseMove={() => isFullScreen && setShowControls(true)}
          >
            {numPages > 0 ? (
              <div className="w-full space-y-0">
                {Array.from({ length: numPages }, (_, idx) => (
                  <LazyPage key={idx} pageNumber={idx + 1} />
                ))}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            )}

            {/* Floating controls in full-screen */}
            {isFullScreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showControls ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none fixed left-0 right-0 bottom-4 flex items-center justify-center z-10"
              >
                <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-black/60 text-white px-4 py-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="disabled:opacity-50 hover:bg-white/20 p-1 rounded"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm whitespace-nowrap">Page {currentPage} of {numPages || 1}</span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= (numPages || 1)}
                    className="disabled:opacity-50 hover:bg-white/20 p-1 rounded"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Document>
    </div>
  );
}

// Simplified thumbnail component
function LazyThumbPage({ Page, pageNumber }: { Page: any; pageNumber: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setVisible(true);
      }
    }, { threshold: 0.01 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      {visible ? (
        <Page 
          pageNumber={pageNumber} 
          width={120} 
          renderTextLayer={false} 
          renderAnnotationLayer={false} 
        />
      ) : (
        <div className="w-full aspect-[3/4] bg-muted/30 animate-pulse rounded" />
      )}
    </div>
  );
}

export default FilePreview;