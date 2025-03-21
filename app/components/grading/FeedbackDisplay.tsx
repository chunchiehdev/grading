// FeedbackDisplay.tsx
import React, { useMemo, useState } from "react";
import type { FeedbackData } from "@/types/grading";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  ClipboardCheck,
  FileText,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type FeedbackVariant = "accordion" | "tabs" | "cards";
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
          className={cn(
            variantStyles[variant],
            "transition-colors duration-200"
          )}
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
          <StrengthBadges
            strengths={section.strengths}
            variant={section.variant}
          />
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const TabsVariant = ({ sections }: VariantProps) => (
  <Tabs defaultValue={sections[0]?.id} className="w-full">
    <TabsList
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }}
    >
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
            <StrengthBadges
              strengths={section.strengths}
              variant={section.variant}
            />
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
          <CardTitle
            className={cn("text-lg font-semibold", {
              "text-green-700": section.variant === "success",
              "text-blue-700": section.variant === "info",
              "text-yellow-700": section.variant === "warning",
            })}
          >
            {section.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">{section.comments}</p>
          <StrengthBadges
            strengths={section.strengths}
            variant={section.variant}
          />
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyFeedbackState = ({ onRetry }: { onRetry?: () => void }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const steps = [
    {
      icon: FileText,
      title: "檢查作業內容",
      description: "確認作業內容是否符合評分標準",
      color: "group-hover:text-primary",
    },
    {
      icon: ClipboardCheck,
      title: "評分進行中",
      description: "根據評分標準給予詳細評價",
      color: "group-hover:text-primary",
    },
    {
      icon: MessageCircle,
      title: "產生回饋建議",
      description: "提供具體的改進建議",
      color: "group-hover:text-primary",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                開始新的評分
              </h2>
              <div className="flex items-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="group relative"
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                  whileHover={{ x: 10 }}
                >
                  <div
                    className={`
                    relative p-4 rounded-lg border border-border
                    transition-all duration-300 ease-in-out
                  `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-md ">
                        <step.icon
                          className={`w-6 h-6 transition-colors ${step.color}`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">
                          {step.title}
                        </h3>
                        <p className="text-sm text-secondary-foreground">
                          {step.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {index < steps.length - 1 && (
                      <motion.div
                        className="absolute left-7 top-full h-4 w-px bg-custom"
                        initial={{ height: 0 }}
                        animate={{ height: 16 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </div>

                  <AnimatePresence>
                    {hoveredIndex === index && (
                      <motion.div
                        className="absolute inset-0 border-2 border-border rounded-lg pointer-events-none"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function FeedbackDisplay({
  feedback,
  variant = "accordion",
  className,
  onRetry,
}: FeedbackDisplayProps) {
  if (!feedback) {
    return <EmptyFeedbackState onRetry={onRetry} />;
  }

  // 根據新的結果格式構建部分
  const sections = useMemo(() => {
    const result: FeedbackSection[] = [];

    // 如果有新格式的分析內容
    if (feedback.analysis) {
      result.push({
        id: "analysis",
        title: "完整評分分析",
        comments: feedback.analysis,
        strengths: feedback.strengths || [],
        variant: "info",
      });
    }

    // 如果有新格式的改進建議
    if (feedback.improvements && feedback.improvements.length > 0) {
      result.push({
        id: "improvements",
        title: "需要改進的地方",
        comments: feedback.overallSuggestions || "以下是需要改進的地方：",
        strengths: feedback.improvements,
        variant: "warning",
      });
    }

    // 如果有詳細評分標準得分
    if (feedback.criteriaScores && feedback.criteriaScores.length > 0) {
      result.push({
        id: "criteria",
        title: "評分標準詳情",
        comments: feedback.criteriaScores.map(c => 
          `${c.name} (${c.score}分): ${c.comments}`
        ).join("\n\n"),
        strengths: [],
        variant: "success",
      });
    }

    // 兼容舊格式 - 如果沒有新格式內容，使用舊格式
    if (result.length === 0) {
      // 摘要部分
      if (feedback.summaryComments) {
        result.push({
          id: "summary",
          title: "摘要評分",
          comments: feedback.summaryComments,
          strengths: feedback.summaryStrengths || [],
          variant: "info",
        });
      }

      // 反思部分
      if (feedback.reflectionComments) {
        result.push({
          id: "reflection",
          title: "反思評價",
          comments: feedback.reflectionComments,
          strengths: feedback.reflectionStrengths || [],
          variant: "success",
        });
      }

      // 問題部分
      if (feedback.questionComments) {
        result.push({
          id: "questions",
          title: "問題回應",
          comments: feedback.questionComments,
          strengths: feedback.questionStrengths || [],
          variant: "warning",
        });
      }
    }

    // 添加總體建議
    if (feedback.overallSuggestions && !result.find(s => s.id === "improvements")) {
      result.push({
        id: "suggestions",
        title: "總體建議",
        comments: feedback.overallSuggestions,
        strengths: [],
        variant: "warning",
      });
    }

    return result;
  }, [feedback]);

  const renderVariant = () => {
    switch (variant) {
      case "accordion":
        return <AccordionVariant sections={sections} />;
      case "tabs":
        return <TabsVariant sections={sections} />;
      case "cards":
        return <CardsVariant sections={sections} />;
      default:
        return <TabsVariant sections={sections} />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">評分結果</h2>
          <p className="text-sm text-muted-foreground">
            評分時間: {feedback.gradingDuration ? 
              `${(feedback.gradingDuration / 1000).toFixed(1)}秒` : 
              "未知"}
          </p>
        </div>
        <ScoreDisplay score={feedback.score} />
      </div>
      {renderVariant()}
    </div>
  );
}
