import React, { useState } from "react";
import { Form } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Progress } from "~/components/ui/progress";
import { CheckCircle2, ChevronRight, Send, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface AssignmentSection {
  id: string;
  title: string;
  placeholder: string;
  content: string;
}

const MAX_LENGTH = 500;

// 步驟顯示組件
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
      <div className="text-sm text-gray-500">
        步驟 {currentStep} / {totalSteps}
      </div>
    </div>
  );
};

// 單個部分輸入組件
const SectionInput = ({
  section,
  onChange,
  maxLength,
}: {
  section: AssignmentSection;
  onChange: (content: string) => void;
  maxLength: number;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{section.title}</h3>
        <span className="text-sm text-gray-500">
          {section.content.length}/{maxLength}
        </span>
      </div>
      <Textarea
        value={section.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={section.placeholder}
        className="h-32 resize-none"
        maxLength={maxLength}
      />
    </div>
  );
};

// 完成預覽組件
const CompletionPreview = ({ sections }: { sections: AssignmentSection[] }) => {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h4 className="font-medium">{section.title}</h4>
          </div>
          <p className="text-gray-600 text-sm pl-7">{section.content}</p>
        </div>
      ))}
    </div>
  );
};

// 主組件
export function AssignmentInput({ disabled = false }: { disabled?: boolean }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sections, setSections] = useState<AssignmentSection[]>([
    {
      id: "summary",
      title: "摘要",
      placeholder: "請輸入文章摘要...",
      content: "",
    },
    {
      id: "reflection",
      title: "反思",
      placeholder: "請輸入您的反思...",
      content: "",
    },
    {
      id: "questions",
      title: "問題",
      placeholder: "請輸入您的問題...",
      content: "",
    },
  ]);

  const totalSteps = sections.length + 1; // 加上最後的預覽步驟
  const currentSection = sections[currentStep - 1];
  const isLastStep = currentStep === totalSteps;
  const isPreviewStep = currentStep === sections.length + 1;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateSection = (content: string) => {
    const updatedSections = sections.map((section, index) => {
      if (index === currentStep - 1) {
        return { ...section, content };
      }
      return section;
    });
    setSections(updatedSections);
  };

  const canProceed = !isPreviewStep 
    ? currentSection?.content.trim().length > 0 
    : sections.every(section => section.content.trim().length > 0);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>作業內容</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>請依序填寫摘要、反思和問題</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Form method="post" className="space-y-6">
          {isPreviewStep ? (
            <CompletionPreview sections={sections} />
          ) : (
            <SectionInput
              section={currentSection}
              onChange={updateSection}
              maxLength={MAX_LENGTH}
            />
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              返回
            </Button>
            
            {isPreviewStep ? (
              <Button
                type="submit"
                disabled={!canProceed || disabled}
                className="gap-2"
              >
                送出 <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="gap-2"
              >
                下一步 <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}