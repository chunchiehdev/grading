import React from 'react';

interface FormPageLayoutProps {
  /** Main page title (e.g., "Create New Course") */
  title: string;

  /** Subtitle/description text displayed under title */
  subtitle: string;

  /** Form content (sections, inputs, buttons) */
  children: React.ReactNode;

  /** Optional back link configuration */
  backLink?: {
    to: string;
    label: string;
  };

  /** Optional additional className for customization */
  className?: string;
}

export function FormPageLayout({ title, subtitle, children, backLink, className = '' }: FormPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`.trim()}>
      {/* Centered header section */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
          {title}
        </h1>
        <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">{subtitle}</p>
      </div>

      {/* Form container */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32">
        {children}
      </div>
    </div>
  );
}
