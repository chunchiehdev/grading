import { Link } from 'react-router';
import { Button } from './button';
import { Card, CardContent } from './card';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  action?: ReactNode; // Custom action element
  icon?: ReactNode;
  className?: string;
  showCard?: boolean;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionLink,
  action,
  icon,
  className,
  showCard = true,
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center space-y-4">
      {icon && <div className="text-muted-foreground mb-2">{icon}</div>}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
      </div>
      {action ||
        (actionText && actionLink && (
          <Button asChild>
            <Link to={actionLink}>{actionText}</Link>
          </Button>
        ))}
    </div>
  );

  if (!showCard) {
    return <div className={`py-8 ${className}`}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6 px-6 pb-8">{content}</CardContent>
    </Card>
  );
}
