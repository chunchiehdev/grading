import { useEffect, useRef, useState, useMemo } from 'react';
import { FileText, FileType, PanelLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface FilePreviewInfo {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string; // optional: direct URL if caller knows it
}

function formatSize(size?: number) {
  if (size == null) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePreview({
  file,
  localFile,
  isFullScreen = false,
  resolveFileUrl,
  fileId: fileIdProp,
  fileUrl: fileUrlProp,
}: {
  file?: FilePreviewInfo;
  localFile?: File | null;
  isFullScreen?: boolean;
  resolveFileUrl?: (fileId: string) => Promise<string | null>;
  fileId?: string; // backward-compat convenience
  fileUrl?: string; // backward-compat convenience
}) {
  const { t } = useTranslation('grading');
  const [src, setSrc] = useState<File | { url: string } | string | null>(null);
  const [resolving, setResolving] = useState(false);

  const isPdf = useMemo(() => {
    const mt = localFile?.type || file?.mimeType || '';
    const url = (typeof src === 'string' ? src : (src && typeof src === 'object' && 'url' in src ? src.url : undefined)) as string | undefined;
    return mt === 'application/pdf' || (url?.toLowerCase().endsWith('.pdf') ?? false);
  }, [localFile?.type, file?.mimeType, src]);

  // Resolve the display source: prefer in-memory File, then provided URLs, then resolve by fileId
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (localFile) {
        setSrc(localFile);
        return;
      }
      if (file?.fileUrl) {
        setSrc(file.fileUrl);
        return;
      }
      if (fileUrlProp) {
        setSrc(fileUrlProp);
        return;
      }
      const idToResolve = file?.fileId || fileIdProp;
      if (idToResolve && resolveFileUrl) {
        setResolving(true);
        try {
          const url = await resolveFileUrl(idToResolve);
          if (!canceled && url) setSrc(url);
        } finally {
          if (!canceled) setResolving(false);
        }
        return;
      }
      setSrc(null);
    })();
    return () => {
      canceled = true;
    };
  }, [localFile, file?.fileUrl, fileUrlProp, file?.fileId, fileIdProp, resolveFileUrl]);

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-medium truncate mb-2 shrink-0" title={file?.fileName}>
        {file?.fileName || t('filePreview.noFileSelected')}
      </div>
      <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
        {isPdf && src ? (
          <ClientPdfViewer src={src} isFullScreen={isFullScreen} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground gap-2">
            {resolving ? (
              <span className="text-sm">{t('filePreview.loadingPdf')}</span>
            ) : isPdf ? (
              <>
                <FileText className="w-5 h-5" />
                <span className="text-sm">{t('filePreview.pdfPlaceholder')}</span>
              </>
            ) : (
              <>
                <FileType className="w-5 h-5" />
                <span className="text-sm">{t('filePreview.pdfOnlySupported')}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2 shrink-0">
        {file?.mimeType || '-'}
        {file?.fileSize ? ` • ${formatSize(file?.fileSize)}` : ''}
      </div>
    </div>
  );
}

function ClientPdfViewer({
  src,
  isFullScreen = false,
}: {
  src: File | { url: string } | string;
  isFullScreen?: boolean;
}) {
  const { t } = useTranslation('grading');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mod, setMod] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  // Responsive width via ResizeObserver
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500); // Start with a more conservative default

  useEffect(() => {
    setIsClient(true);
    (async () => {
      try {
        const m = await import('react-pdf');
        m.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        setMod(m);
      } catch (e) {
        console.error('Failed to load react-pdf:', e);
      }
    })();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        if (width > 0) setContainerWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track current page on scroll
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

  // Full-screen arrow keys
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
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        {t('filePreview.loadingPdf')}
      </div>
    );
  }

  // React-PDF components with proper type handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Document = mod.Document as React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Page = mod.Page as React.ComponentType<any>;

  // Calculate page width accounting for padding and sidebar
  const sidebarWidth = isSidebarOpen ? 200 : 0;
  const contentPadding = 32; // px-4 = 16px each side
  const availableWidth = containerWidth - sidebarWidth - contentPadding;
  const pageWidth = Math.max(300, Math.min(availableWidth * 0.95, 800)); // Use 95% to ensure no overflow

  const onLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);
  const scrollToPage = (index: number) =>
    pagesRef.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const goToPage = (page: number) => scrollToPage(Math.max(0, Math.min((numPages || 1) - 1, page - 1)));

  function LazyPage({ pageNumber }: { pageNumber: number }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const node = ref.current;
      if (!node) return;
      const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)), {
        root: contentRef.current,
        threshold: 0.01,
      });
      io.observe(node);
      return () => io.disconnect();
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
          <div className="flex justify-center w-full">
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow max-w-full"
              loading={
                <div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">
                  {t('filePreview.loadingPage')}
                </div>
              }
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-muted/30 animate-pulse rounded max-w-2xl" />
        )}
      </div>
    );
  }

  function Thumb({ pageNumber }: { pageNumber: number }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const node = ref.current;
      if (!node) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setVisible(true);
        },
        { threshold: 0.01 }
      );
      io.observe(node);
      return () => io.disconnect();
    }, []);
    return (
      <div ref={ref} className="w-full">
        {visible ? (
          <Page pageNumber={pageNumber} width={120} renderTextLayer={false} renderAnnotationLayer={false} />
        ) : (
          <div className="w-full aspect-[3/4] bg-muted/30 animate-pulse rounded" />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
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

      <div className="flex-1 min-h-0 overflow-hidden">
        <Document
          file={src}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          }
          className="w-full h-full"
        >
          <div ref={containerRef} className="relative w-full h-full">
            {/* Sidebar */}
            {!isFullScreen && (
              <>
                {isSidebarOpen && (
                  <div
                    className="absolute inset-0 bg-black/10 z-10 transition-opacity duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                  />
                )}
                <div
                  className={`absolute top-0 left-0 h-full w-40 bg-background border-r shadow-lg transform transition-transform duration-200 z-20 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                  <div className="w-full h-full overflow-y-auto">
                    <div className="p-2 space-y-2">
                      {numPages > 0 &&
                        Array.from({ length: numPages }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => goToPage(i + 1)}
                            className="w-full rounded border hover:bg-muted/50 p-1 text-xs text-muted-foreground text-left"
                            title={`第 ${i + 1} 頁`}
                          >
                            <Thumb pageNumber={i + 1} />
                            <div className="mt-1 text-center">{i + 1}</div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div
              ref={contentRef}
              className="absolute inset-0 overflow-y-auto px-4 py-2"
              onMouseMove={() => isFullScreen && setShowControls(true)}
            >
              {numPages > 0 ? (
                <div className="w-full space-y-0">
                  {Array.from({ length: numPages }, (_, idx) => (
                    <LazyPage key={idx} pageNumber={idx + 1} />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              )}

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
                    <span className="text-sm whitespace-nowrap">
                      Page {currentPage} of {numPages || 1}
                    </span>
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
    </div>
  );
}

export default FilePreview;
