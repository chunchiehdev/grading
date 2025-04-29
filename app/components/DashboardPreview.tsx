import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, Brain } from "lucide-react";

const DashboardPreview = () => {
  const [progress, setProgress] = useState(0);

  const performanceData = [
    { month: "1月", score: 75 },
    { month: "2月", score: 82 },
    { month: "3月", score: 78 },
    { month: "4月", score: 85 },
    { month: "5月", score: 90 },
    { month: "6月", score: 88 },
  ];

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full p-6 space-y-6">
      <Card className="border-2 border-[#F5F7FA]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#2A4858]">即時評分進度</CardTitle>
            <Badge variant="outline" className="bg-[#F5F7FA]">
              進行中
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-[#5C798F]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>預計完成時間: 2分鐘</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>AI 分析中</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-[#F5F7FA]">
        <CardHeader>
          <CardTitle className="text-[#2A4858]">學習成效趨勢</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2A4858"
                  strokeWidth={2}
                  dot={{ stroke: "#2A4858", strokeWidth: 2, fill: "white" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-[#F5F7FA]">
        <CardHeader>
          <CardTitle className="text-[#2A4858]">評分詳情</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>內容完整性評估</AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-32 rounded-md border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>主題明確性: 90%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>論述完整性: 85%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>證據支持度: 88%</span>
                    </div>
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export { DashboardPreview };
