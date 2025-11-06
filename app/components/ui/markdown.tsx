import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import type { Components } from 'react-markdown';

interface MarkdownProps {
  children: string;
  className?: string;
  allowHtml?: boolean;
  disableSanitize?: boolean;
}

/**
 * Reusable Markdown component with GitHub Flavored Markdown support
 * Includes security features like HTML sanitization by default
 */
export function Markdown({ children, className, allowHtml = false, disableSanitize = false }: MarkdownProps) {
  const remarkPlugins = [remarkGfm];
  const rehypePlugins: any[] = [];

  // Add HTML support if requested
  if (allowHtml) {
    rehypePlugins.push(rehypeRaw);
  }

  // Add sanitization unless explicitly disabled
  if (!disableSanitize && allowHtml) {
    rehypePlugins.push(rehypeSanitize);
  }

  const components: Components = {
    // Custom component overrides
    h1: ({ children }) => <h1 className="text-2xl font-semibold text-foreground mb-4 mt-6 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mb-3 mt-5 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h3>,
    p: ({ children }) => <p className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-outside ml-4 space-y-1 mb-3">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-outside ml-4 space-y-1 mb-3">{children}</ol>,
    li: ({ children }) => <li className="text-sm text-foreground">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
    code: ({ className: codeClassName, children, ...props }) => {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const isInline = !match;

      if (isInline) {
        return <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono text-foreground" {...props}>{children}</code>;
      }

      return <code className={cn("text-sm font-mono", codeClassName)} {...props}>{children}</code>;
    },
    pre: ({ children }) => <pre className="bg-muted border rounded-lg p-4 overflow-x-auto mb-3 text-sm">{children}</pre>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary bg-muted/30 pl-4 py-2 my-3 italic">{children}</blockquote>
    ),
    a: ({ children, href }) => (
      <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-3">
        <table className="min-w-full divide-y divide-border">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 text-sm text-foreground">{children}</td>,
    hr: () => <hr className="my-4 border-border" />,
  };

  return (
    <div
      className={cn(
        // Base styles
        'markdown-content max-w-none',
        // Remove default prose margins for better control
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Fallback component that renders plain text with basic formatting
 * Used when Markdown content is not available
 */
export function PlainTextFallback({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      {children.split('\n').map((para, i) => (
        <p key={i} className={i > 0 ? 'mt-3' : ''}>
          {para}
        </p>
      ))}
    </div>
  );
}

/**
 * Smart content renderer that uses Markdown if available, falls back to plain text
 */
export function SmartContent({
  markdown,
  plainText,
  className,
  fallbackClassName,
}: {
  markdown?: string;
  plainText: string;
  className?: string;
  fallbackClassName?: string;
}) {
  if (markdown && markdown.trim()) {
    return <Markdown className={className}>{markdown}</Markdown>;
  }

  return <PlainTextFallback className={fallbackClassName || className}>{plainText}</PlainTextFallback>;
}
