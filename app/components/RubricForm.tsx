import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface RubricFormData {
  name: string;
  description: string;
}

interface RubricFormProps {
  data: RubricFormData;
  onChange: (data: RubricFormData) => void;
}

export const RubricForm = ({ data, onChange }: RubricFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          基本資訊
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            評分標準名稱 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="例如：流程圖評分標準"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            描述 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="描述這個評分標準的用途和適用場景..."
            className="mt-1.5"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}; 