import { Link } from "@remix-run/react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionLink,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6 px-6 pb-8 flex flex-col items-center justify-center text-center space-y-4">
        {icon && <div className="text-muted-foreground mb-2">{icon}</div>}
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        {actionText && actionLink && (
          <Button asChild className="mt-2">
            <Link to={actionLink}>{actionText}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 