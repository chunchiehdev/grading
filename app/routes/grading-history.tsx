import { useLoaderData, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Download, Clock, FileText, Filter } from "lucide-react";

// 模擬評分歷史資料
interface GradingHistoryItem {
  id: string;
  fileName: string;
  score: number;
  rubricName: string;
  gradedAt: string;
  duration: number;
}

export const loader = async () => {
  // 這裡應該從數據庫獲取評分歷史
  const mockHistory: GradingHistoryItem[] = [
    {
      id: "grad-001",
      fileName: "期末報告.pdf",
      score: 92,
      rubricName: "論文評分標準",
      gradedAt: "2023-06-15T14:32:00Z",
      duration: 6200,
    },
    {
      id: "grad-002",
      fileName: "研究計畫書.docx",
      score: 85,
      rubricName: "研究計畫評分標準",
      gradedAt: "2023-06-14T09:12:00Z",
      duration: 5800,
    },
    {
      id: "grad-003",
      fileName: "文學分析.pdf",
      score: 78,
      rubricName: "文學分析評分標準",
      gradedAt: "2023-06-13T16:45:00Z",
      duration: 4900,
    },
    {
      id: "grad-004",
      fileName: "科學報告.pdf",
      score: 88,
      rubricName: "科學報告評分標準",
      gradedAt: "2023-06-12T11:20:00Z",
      duration: 5500,
    },
    {
      id: "grad-005",
      fileName: "專題簡報.pdf",
      score: 94,
      rubricName: "簡報評分標準",
      gradedAt: "2023-06-10T15:10:00Z",
      duration: 4200,
    },
  ];

  return Response.json({ history: mockHistory });
};

function getScoreBadgeVariant(score: number) {
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 80) return "bg-blue-100 text-blue-800";
  if (score >= 70) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default function GradingHistory() {
  const { history } = useLoaderData<{ history: GradingHistoryItem[] }>();

  return (
    <div className="container px-4 py-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">評分歷史</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            匯出紀錄
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            篩選
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-8">
        <TabsList>
          <TabsTrigger value="all">全部紀錄</TabsTrigger>
          <TabsTrigger value="recent">最近評分</TabsTrigger>
          <TabsTrigger value="highscore">高分紀錄</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>檔案名稱</TableHead>
                    <TableHead>評分標準</TableHead>
                    <TableHead>評分時間</TableHead>
                    <TableHead className="text-center">評分</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {item.fileName}
                        </div>
                      </TableCell>
                      <TableCell>{item.rubricName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{new Date(item.gradedAt).toLocaleDateString("zh-TW")}</span>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {(item.duration / 1000).toFixed(1)}秒
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="secondary" 
                          className={`px-2 ${getScoreBadgeVariant(item.score)}`}
                        >
                          {item.score}分
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link to={`/grading-view/${item.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">顯示最近7天的評分記錄</p>
              {/* 這裡可以添加最近評分的篩選內容 */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highscore" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">顯示得分高於85分的記錄</p>
              {/* 這裡可以添加高分紀錄的篩選內容 */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>評分統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">總評分次數</p>
              <p className="text-2xl font-bold">{history.length}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">平均分數</p>
              <p className="text-2xl font-bold">
                {(history.reduce((acc, item) => acc + item.score, 0) / history.length).toFixed(1)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">最高分</p>
              <p className="text-2xl font-bold">{Math.max(...history.map(item => item.score))}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 