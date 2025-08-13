import { useEffect, useRef, useState } from 'react';
import { FileText, FileType } from 'lucide-react';

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

export function FilePreview({ file, localFile }: { file?: FilePreviewInfo; localFile?: File | null }) {
  const isPdf = (localFile?.type || file?.mimeType) === 'application/pdf';

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Filename above */}
      <div className="text-sm font-medium truncate mb-2" title={file?.fileName}>{file?.fileName || '尚未選擇檔案'}</div>
      {/* Preview area */}
      <div className="flex-1 min-h-0 border rounded-md overflow-auto bg-background">
        {isPdf && localFile ? (
          <ClientPdfViewer file={localFile} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground gap-2">
            {isPdf ? <FileText className="w-5 h-5" /> : <FileType className="w-5 h-5" />}
            <span className="text-sm">{isPdf ? '選擇的 PDF 將顯示在此處' : '目前僅支援 PDF 預覽'}</span>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        {(file?.mimeType || '-')}{file?.fileSize ? ` • ${formatSize(file?.fileSize)}` : ''}
      </div>
    </div>
  );
}

function ClientPdfViewer({ file }: { file: File }) {
  const [mod, setMod] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [showThumbs, setShowThumbs] = useState<boolean>(true);

  // Avoid SSR import of react-pdf
  useEffect(() => {
    setIsClient(true);
    (async () => {
      try {
        const m = await import('react-pdf');
        // Configure worker
        m.pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        setMod(m);
      } catch (e) {
        // noop – fallback icon will be shown by parent if needed
        console.error('Failed to load react-pdf:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setWidth(Math.max(0, Math.floor(w)));
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

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
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Intersection-aware page wrapper to lazy render when visible
  function LazyPage({ pageNumber }: { pageNumber: number }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const node = ref.current;
      if (!node) return;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setVisible(true);
        }
      }, { root: containerRef.current, threshold: 0.01 });
      io.observe(node);
      return () => io.disconnect();
    }, []);
    return (
      <div ref={(el) => { ref.current = el; pagesRef.current[pageNumber - 1] = el; }} className="mb-4 last:mb-0">
        {visible ? (
          <Page
            pageNumber={pageNumber}
            width={width ? Math.min(width - 16, 1400) : 600}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={<div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">Loading page…</div>}
          />
        ) : (
          <div className="w-full h-40 bg-muted/30 animate-pulse rounded" />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <Document
        file={file}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}
      >
        {/* Thumbnails bar (optional, toggleable) */}
        {showThumbs && numPages > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b">
            {Array.from({ length: numPages }, (_, i) => (
              <button
                key={i}
                onClick={() => scrollToPage(i)}
                className="shrink-0 rounded border hover:bg-muted/50 p-1 text-xs text-muted-foreground"
                title={`第 ${i + 1} 頁`}
              >
                <div className="w-[48px]">
                  <LazyThumbPage Page={Page} pageNumber={i + 1} />
                </div>
              </button>
            ))}
            <div className="ml-auto">
              <button
                onClick={() => setShowThumbs(false)}
                className="text-xs text-muted-foreground hover:underline"
              >
                隱藏
              </button>
            </div>
          </div>
        )}
        {!showThumbs && (
          <div className="pb-2">
            <button onClick={() => setShowThumbs(true)} className="text-xs text-muted-foreground hover:underline">顯示縮圖列</button>
          </div>
        )}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-auto py-2">
          {numPages > 0 ? (
            Array.from({ length: numPages }, (_, idx) => (
              <LazyPage key={idx} pageNumber={idx + 1} />
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          )}
        </div>
      </Document>
    </div>
  );
}

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
    <div ref={ref} className="w-[48px]">
      {visible ? (
        <Page pageNumber={pageNumber} width={48} renderTextLayer={false} renderAnnotationLayer={false} />
      ) : (
        <div className="w-[48px] h-[64px] bg-muted/30 animate-pulse rounded" />
      )}
    </div>
  );
}

export default FilePreview;
