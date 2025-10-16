import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RubricFormData {
  name: string;
  description: string;
}

interface RubricFormProps {
  data: RubricFormData;
  onChange: (data: RubricFormData) => void;
  title?: string;
}

export const RubricForm = ({ data, onChange, title }: RubricFormProps) => {
  const { t } = useTranslation('rubric');
  const displayTitle = title || t('form.basicInfo');
  return (
    <Card className="bg-card rounded-2xl shadow-sm">
      <CardHeader className="p-5 sm:p-6 lg:p-8 xl:p-10">
        <CardTitle className="flex items-center gap-2 lg:gap-3 text-lg lg:text-xl xl:text-2xl font-semibold">
          <FileText className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 lg:space-y-6 p-5 sm:p-6 lg:p-8 xl:p-10 pt-0">
        <div className="space-y-2 lg:space-y-3">
          <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
            {t('form.rubricName')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder={t('form.rubricNamePlaceholder')}
            className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
          />
        </div>
        <div className="space-y-2 lg:space-y-3">
          <Label htmlFor="description" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
            {t('form.rubricDescription')} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder={t('form.rubricDescriptionPlaceholder')}
            className="rounded-xl text-base lg:text-lg xl:text-xl"
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
};
