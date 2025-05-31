import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';

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
export function Markdown({ 
  children, 
  className, 
  allowHtml = false, 
  disableSanitize = false 
}: MarkdownProps) {
  const plugins = [remarkGfm];
  const rehypePlugins = [];

  // Add HTML support if requested
  if (allowHtml) {
    rehypePlugins.push(rehypeRaw);
  }

  // Add sanitization unless explicitly disabled
  if (!disableSanitize) {
    rehypePlugins.push(rehypeSanitize);
  }

  return (
    <div className={cn(
        // Base Tailwind prose styles
        'prose prose-slate max-w-none',
        // Dark mode support
        'dark:prose-invert',
        // Custom styling for better integration
        'prose-headings:font-semibold',
        'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        'prose-p:text-sm prose-p:leading-relaxed',
        'prose-li:text-sm',
        'prose-strong:font-semibold prose-strong:text-foreground',
        'prose-em:italic prose-em:text-muted-foreground',
        'prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
        'prose-pre:bg-muted prose-pre:border',
        'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:pl-4',
        'prose-table:text-sm',
        'prose-th:text-left prose-th:font-semibold',
        'prose-td:py-2 prose-th:py-2',
        className
      )}>
    <ReactMarkdown
      remarkPlugins={plugins}
      rehypePlugins={rehypePlugins}
      components={{
        // Custom component overrides
        h1: ({ children }) => (
          <h1 className="text-2xl font-semibold text-foreground mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-foreground mb-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-foreground mb-2">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed text-foreground mb-3">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-foreground">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-muted-foreground">{children}</em>
        ),
        code: ({ children }) => (
          <code className="text-sm bg-muted px-1 py-0.5 rounded font-mono">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted border rounded p-3 overflow-x-auto">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary bg-muted/50 pl-4 py-2 my-3">{children}</blockquote>
        ),
      }}
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
export function PlainTextFallback({ 
  children, 
  className 
}: { 
  children: string; 
  className?: string; 
}) {
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
  fallbackClassName 
}: {
  markdown?: string;
  plainText: string;
  className?: string;
  fallbackClassName?: string;
}) {
  if (markdown && markdown.trim()) {
    return <Markdown className={className}>{markdown}</Markdown>;
  }
  
  return (
    <PlainTextFallback className={fallbackClassName || className}>
      {plainText}
    </PlainTextFallback>
  );
}