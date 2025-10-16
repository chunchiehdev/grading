import React from 'react';

interface FormSectionProps {
  /** Section content (labels, inputs, etc.) */
  children: React.ReactNode;

  /** Optional additional spacing classes */
  className?: string;

  /** Optional section title (if needed) */
  title?: string;

  /** Optional icon to display with title */
  icon?: React.ReactNode;
}

export function FormSection({ children, className = '', title, icon }: FormSectionProps) {
  return (
    <div
      className={`bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6 ${className}`.trim()}
    >
      {title && (
        <h2 className="text-lg lg:text-xl font-semibold text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
