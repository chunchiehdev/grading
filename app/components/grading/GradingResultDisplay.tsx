import { Star, File, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyGradingState } from "./EmptyGradingState";

// 專門用於評分結果的類型定義
export interface GradingResultData {
  score: number;
  imageUnderstanding?: string;  // 對圖片的理解和看法
  analysis: string;
  criteriaScores: {
    name: string;
    score: number;
    comments: string;
  }[];
  strengths: string[];
  improvements: string[];
  overallSuggestions?: string;
  
  // 元數據
  createdAt: Date | string;
  gradingDuration?: number;
}

interface GradingResultDisplayProps {
  result?: GradingResultData;
  className?: string;
  onRetry?: () => void;
}

// 顯示評分分數的組件
const ScoreCard = ({ score }: { score: number }) => (
  <Card className="mb-4">
    <CardContent className="pt-6 text-center">
      <div className="flex items-center justify-center mb-2">
        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 mr-2" />
        <span className="text-5xl font-bold">{score}</span>
        <span className="text-2xl text-muted-foreground ml-1">/100</span>
      </div>
      <p className="text-muted-foreground">
        {score >= 90
          ? "優異"
          : score >= 80
          ? "優良"
          : score >= 70
          ? "良好"
          : score >= 60
          ? "尚可"
          : "需要改進"}
      </p>
    </CardContent>
  </Card>
);

// 優點和改進項目的標籤組件
const TagsList = ({
  items,
  variant = "default",
}: {
  items: string[];
  variant?: "strength" | "improvement" | "default";
}) => {
  const variantStyles = {
    strength: "bg-green-100 text-green-800 hover:bg-green-200",
    improvement: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    default: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className={cn(
            "px-3 py-1 text-sm rounded-full",
            variantStyles[variant]
          )}
        >
          {item}
        </Badge>
      ))}
    </div>
  );
};

// 顯示評分標準詳情的組件
const CriteriaDetails = ({
  criteriaScores,
}: {
  criteriaScores: GradingResultData["criteriaScores"];
}) => {
  if (!criteriaScores || criteriaScores.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {criteriaScores.map((criteria, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-slate-50 py-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">{criteria.name}</h4>
              <Badge variant="outline" className="font-bold">
                {criteria.score} 分
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 text-sm">
            <p>{criteria.comments}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// 分析內容顯示
const AnalysisSection = ({ analysis, imageUnderstanding }: { analysis: string; imageUnderstanding?: string }) => {
  if (!analysis && !imageUnderstanding) return null;
  
  // 轉換圖片理解部分的格式
  const formattedImageUnderstanding = imageUnderstanding ? 
    imageUnderstanding.split("\n").map((para, i) => (
      <p key={`img-${i}`} className={i > 0 ? "mt-4" : ""}>
        {para}
      </p>
    )) : null;
  
  // 轉換分析部分的格式
  const formattedAnalysis = analysis
    ? analysis.split("\n").map((para, i) => (
        <p key={`analysis-${i}`} className={i > 0 ? "mt-4" : ""}>
          {para}
        </p>
      ))
    : [];

  return (
    <div className="mt-4 prose prose-slate max-w-none">
      {formattedImageUnderstanding && (
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            圖片分析理解
          </h3>
          <div className="pl-4 border-l-4 border-blue-200 py-2 bg-blue-50 rounded-sm">
            {formattedImageUnderstanding}
          </div>
        </div>
      )}
      {formattedAnalysis.length > 0 && formattedAnalysis}
    </div>
  );
};

export function GradingResultDisplay({
  result,
  className,
  onRetry,
}: GradingResultDisplayProps) {
  if (!result) {
    return <EmptyGradingState onRetry={onRetry} />;
  }
  
  // 計算創建時間
  const createdDate = result.createdAt
    ? new Date(result.createdAt) 
    : new Date();
  
  const formattedDate = createdDate.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:space-x-4">
            <span>評分時間: {formattedDate}</span>
            {result.gradingDuration && (
              <span>處理時間: {(result.gradingDuration / 1000).toFixed(1)}秒</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ScoreCard score={result.score} />
          
          {/* 優點列表 */}
          {(result.strengths && result.strengths.length > 0) && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <File className="h-5 w-5 mr-2 text-green-600" />
                  優點
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TagsList items={result.strengths} variant="strength" />
              </CardContent>
            </Card>
          )}
          
          {/* 改進項目 */}
          {(result.improvements && result.improvements.length > 0) && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <ArrowUpDown className="h-5 w-5 mr-2 text-yellow-600" />
                  需要改進
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TagsList items={result.improvements} variant="improvement" />
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="md:col-span-2">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis">詳細分析</TabsTrigger>
              <TabsTrigger value="criteria">評分標準</TabsTrigger>
            </TabsList>
            
            <TabsContent value="analysis" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>評分分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisSection analysis={result.analysis} imageUnderstanding={result.imageUnderstanding} />
                  
                  {/* 整體建議 */}
                  {result.overallSuggestions && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-medium mb-2">整體建議</h3>
                      <p>{result.overallSuggestions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="criteria" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>評分標準詳情</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 顯示詳細評分項目 */}
                  <CriteriaDetails criteriaScores={result.criteriaScores} />
                  
                  {/* 如果沒有細項評分標準，顯示總分說明 */}
                  {(!result.criteriaScores || result.criteriaScores.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-lg text-muted-foreground">
                        總評分: {result.score} 分
                      </p>
                      {result.overallSuggestions && (
                        <p className="mt-4 max-w-md mx-auto">
                          {result.overallSuggestions}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 