import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RubricHeaderProps {
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
  rubricName?: string;
  isEditing?: boolean;
}

export const RubricHeader = ({ onBack, onSave, onPreview, rubricName, isEditing = false }: RubricHeaderProps) => {
  const { t } = useTranslation('rubric');
  return (
    <div className="border-b bg-background/95 backdrop-blur-sm z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} type="button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('header.backButton')}
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold">
              {isEditing
                ? t('header.editTitle', { rubricName: rubricName || t('header.newRubricTitle') })
                : rubricName || t('header.newRubricTitle')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPreview} type="button">
              <Eye className="w-4 h-4 mr-2" />
              {t('header.previewButton')}
            </Button>
            <Button size="sm" onClick={onSave} type="button">
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? t('header.updateButton') : t('header.saveButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
