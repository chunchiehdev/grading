import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layout } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ 
  icon = <Layout className="w-12 h-12" />, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) => {
  const { t } = useTranslation('common');
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-muted-foreground/50 mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}; 