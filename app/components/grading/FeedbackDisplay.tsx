import React, { useMemo } from "react";
import type { FeedbackData } from "~/types/grading";
import { Star, Search, Pencil, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

type FeedbackVariant = 'accordion' | 'tabs' | 'cards';
type StrengthVariant = "success" | "info" | "warning";

interface FeedbackDisplayProps {
  feedback?: FeedbackData;
  variant?: FeedbackVariant;
  className?: string;
  onRetry?: () => void;
}

interface FeedbackSection {
  id: string;
  title: string;
  comments: string;
  strengths: string[];
  variant: StrengthVariant;
}

interface ScoreDisplayProps {
  score: number;
  className?: string;
}

interface StrengthBadgesProps {
  strengths: string[];
  variant: StrengthVariant;
}

interface VariantProps {
  sections: FeedbackSection[];
}

const ScoreDisplay = ({ score, className }: ScoreDisplayProps) => (
  <Card className={cn("mb-6", className)}>
    <CardContent className="pt-6">
      <div className="flex items-center justify-center gap-2">
        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
        <span className="text-4xl font-bold text-gray-800">{score}/100</span>
      </div>
    </CardContent>
  </Card>
);

const StrengthBadges = ({ strengths, variant }: StrengthBadgesProps) => {
  const variantStyles: Record<StrengthVariant, string> = {
    success: "bg-green-100 text-green-800 hover:bg-green-200",
    info: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  };

  if (!strengths.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {strengths.map((strength) => (
        <Badge
          key={strength}
          variant="secondary"
          className={cn(variantStyles[variant], "transition-colors duration-200")}
        >
          {strength}
        </Badge>
      ))}
    </div>
  );
};

const AccordionVariant = ({ sections }: VariantProps) => (
  <Accordion type="single" collapsible className="w-full">
    {sections.map((section) => (
      <AccordionItem key={section.id} value={section.id}>
        <AccordionTrigger>{section.title}</AccordionTrigger>
        <AccordionContent>
          <p className="text-gray-700 mb-3">{section.comments}</p>
          <StrengthBadges strengths={section.strengths} variant={section.variant} />
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const TabsVariant = ({ sections }: VariantProps) => (
  <Tabs defaultValue={sections[0]?.id} className="w-full">
    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }}>
      {sections.map((section) => (
        <TabsTrigger key={section.id} value={section.id}>
          {section.title}
        </TabsTrigger>
      ))}
    </TabsList>
    
    {sections.map((section) => (
      <TabsContent key={section.id} value={section.id}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700 mb-3">{section.comments}</p>
            <StrengthBadges strengths={section.strengths} variant={section.variant} />
          </CardContent>
        </Card>
      </TabsContent>
    ))}
  </Tabs>
);

const CardsVariant = ({ sections }: VariantProps) => (
  <div className="grid gap-6">
    {sections.map((section) => (
      <Card key={section.id}>
        <CardHeader>
          <CardTitle className={cn(
            "text-lg font-semibold",
            {
              "text-green-700": section.variant === "success",
              "text-blue-700": section.variant === "info",
              "text-yellow-700": section.variant === "warning"
            }
          )}>
            {section.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">{section.comments}</p>
          <StrengthBadges strengths={section.strengths} variant={section.variant} />
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyFeedbackState = ({ onRetry }: { onRetry?: () => void }) => (
  <Card className="w-full">
    <CardContent className="pt-6">
      <div className="flex flex-col items-center justify-center py-8 gap-8">
        <div className="grid grid-cols-3 gap-4">
          {[Search, Pencil, CheckCircle].map((Icon, index) => (
            <div
              key={index}
              className="w-16 h-16 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 transition-colors duration-200 hover:bg-gray-100"
            >
              <Icon className="w-8 h-8 text-gray-400" />
            </div>
          ))}
        </div>
        <div className="text-center space-y-2">
          <p className="text-gray-600">請輸入作業內容開始評分</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-blue-500 hover:underline focus:outline-none"
            >
              重新開始
            </button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export function FeedbackDisplay({ 
  feedback, 
  variant = "accordion",
  className,
  onRetry
}: FeedbackDisplayProps) {
  const sections = useMemo((): FeedbackSection[] => {
    if (!feedback) return [];
    
    return [
      {
        id: "summary",
        title: "摘要評分",
        comments: feedback.summaryComments,
        strengths: feedback.summaryStrengths,
        variant: "success"
      },
      {
        id: "reflection",
        title: "反思評分",
        comments: feedback.reflectionComments,
        strengths: feedback.reflectionStrengths,
        variant: "info"
      },
      {
        id: "questions",
        title: "問題評分",
        comments: feedback.questionComments,
        strengths: feedback.questionStrengths,
        variant: "warning"
      },
      {
        id: "overall",
        title: "整體建議",
        comments: feedback.overallSuggestions,
        strengths: [],
        variant: "info"
      }
    ];
  }, [feedback]);

  if (!feedback) {
    return <EmptyFeedbackState onRetry={onRetry} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      <ScoreDisplay score={feedback.score} />
      
      {variant === "accordion" && <AccordionVariant sections={sections} />}
      {variant === "tabs" && <TabsVariant sections={sections} />}
      {variant === "cards" && <CardsVariant sections={sections} />}
    </div>
  );
}