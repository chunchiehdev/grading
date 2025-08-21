import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            {t('form.rubricName')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder={t('form.rubricNamePlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            {t('form.rubricDescription')} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder={t('form.rubricDescriptionPlaceholder')}
            className="mt-1.5"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}; 
