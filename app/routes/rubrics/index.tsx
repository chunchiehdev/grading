import React, { useState, useEffect } from 'react';
import { Link, useLoaderData, Form } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Calendar,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Rubric } from '@/types/rubric';
import { dbCriteriaToUICategories, calculateRubricStats } from '@/utils/rubric-transform';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const loader = async () => {
  console.log('Fetching rubrics in loader...');
  const { listRubrics } = await import('@/services/rubric.server');
  const { rubrics, error } = await listRubrics();
  console.log('Rubrics response in loader:', { rubrics, error });

  if (error) {
    return { rubrics: [], error };
  }

  return { rubrics: rubrics || [], error: null };
};

export default function RubricsIndexRoute() {
  const { rubrics, error } = useLoaderData<typeof loader>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredRubrics = rubrics.filter((rubric: Rubric) =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rubric.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log('Component state:', { data: rubrics, error });

  if (error) {
    console.error('Error in component:', error);
    return (
      <div className="container py-8">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-semibold mb-2">載入失敗</h3>
            <p className="text-sm">{typeof error === 'string' ? error : '無法載入評分標準'}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              重新載入
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!rubrics || rubrics.length === 0) {
    console.log('No data or empty data array');
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* 空狀態 */}
          <Card className="border-2 border-dashed border-muted-foreground/25">
            <CardContent className="flex flex-col items-center p-12 space-y-6">
              <div className="rounded-full bg-primary/10 p-6">
                <FileText className="h-12 w-12 text-primary" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">建立您的第一個評分標準</h3>
                <p className="text-muted-foreground max-w-md leading-relaxed">
                  評分標準幫助您客觀、一致地評估學生作業。每個標準都包含詳細的等級描述，確保評分的公平性。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild>
                  <Link to="/rubrics/new">
                    <Plus className="mr-2 h-5 w-5" />
                    建立評分標準
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/help/rubrics">
                    <FileText className="mr-2 h-5 w-5" />
                    使用指南
                  </Link>
                </Button>
              </div>

              {/* 功能預覽 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-sm">多層級評分</h4>
                  <p className="text-xs text-muted-foreground mt-1">1-4分的詳細等級描述</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Eye className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-sm">即時預覽</h4>
                  <p className="text-xs text-muted-foreground mt-1">建立過程中隨時預覽效果</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Edit className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-sm">靈活編輯</h4>
                  <p className="text-xs text-muted-foreground mt-1">支援內聯編輯和批量修改</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  console.log('Rendering rubrics:', rubrics);
  
  return (
    <div className="container mx-auto py-8">
      {/* 頁面標題和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">評分標準管理</h1>
          <p className="text-muted-foreground mt-1">
            管理您的評分標準，確保評分的一致性和客觀性
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            篩選
          </Button>
          <Button asChild>
            <Link to="/rubrics/new">
              <Plus className="mr-2 h-4 w-4" />
              新增評分標準
            </Link>
          </Button>
        </div>
      </div>

      {/* 搜尋和統計 */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* 搜尋欄 */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋評分標準名稱或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:w-96">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{rubrics.length}</div>
              <div className="text-xs text-muted-foreground">評分標準</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {rubrics.reduce((acc: number, rubric: Rubric) => acc + (rubric.criteria?.length || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">總標準數</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {rubrics.reduce((acc: number, rubric: Rubric) => acc + (rubric.criteria?.length || 0) * 4, 0)}
              </div>
              <div className="text-xs text-muted-foreground">總分數</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round(rubrics.filter((r: Rubric) => r.criteria && r.criteria.length > 0).length / rubrics.length * 100) || 0}%
              </div>
              <div className="text-xs text-muted-foreground">完整率</div>
            </div>
          </Card>
        </div>
      </div>

      {/* 評分標準列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRubrics.map((rubric: Rubric) => {
          // 計算統計資訊
          const categories = dbCriteriaToUICategories(rubric.criteria || []);
          const stats = calculateRubricStats(categories);

          return (
            <Card key={rubric.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-2 text-lg">{rubric.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {rubric.description}
                    </CardDescription>
                  </div>
                  <Badge variant={stats.completionRate === 100 ? "default" : "secondary"} className="ml-2">
                    {stats.completionRate}%
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 統計資訊 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">類別:</span>
                    <span className="font-medium">{stats.totalCategories}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">標準:</span>
                    <span className="font-medium">{stats.totalCriteria}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">總分:</span>
                    <span className="font-medium">{stats.maxScore}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">完成:</span>
                    <span className="font-medium">{stats.completedCriteria}/{stats.totalCriteria}</span>
                  </div>
                </div>

                {/* 進度條 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">完成進度</span>
                    <span className="font-medium">{stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* 時間資訊 */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>建立於 {format(new Date(rubric.createdAt), 'yyyy/MM/dd', { locale: zhTW })}</span>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/rubrics/${rubric.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/rubrics/${rubric.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" />
                        編輯
                      </Link>
                    </Button>
                  </div>
                  
                  {/* 刪除按鈕 - 使用 Form 提交到詳情頁面 */}
                  <Form method="post" action={`/rubrics/${rubric.id}`} className="inline">
                    <input type="hidden" name="intent" value="delete" />
                    <Button 
                      type="submit"
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`確定要刪除「${rubric.name}」嗎？此操作無法復原。`)) {
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 搜尋無結果 */}
      {searchQuery && filteredRubrics.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">找不到相關的評分標準</h3>
          <p className="text-muted-foreground mb-4">
            嘗試使用其他關鍵字或建立新的評分標準
          </p>
          <Button asChild>
            <Link to="/rubrics/new">
              <Plus className="mr-2 h-4 w-4" />
              建立新的評分標準
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
