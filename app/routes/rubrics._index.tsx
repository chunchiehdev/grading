import { Link, useLoaderData } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import type { Rubric } from "@/types/grading";

export const loader = async ({ request }: { request: Request }) => {
  const { listRubrics } = await import("@/services/rubric.server");
  const { rubrics, error } = await listRubrics();
  
  if (error) {
    console.error("Error loading rubrics:", error);
  }

  return { rubrics, error };
};

export default function RubricsIndexRoute() {
  const { rubrics } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">評分標準管理</h1>
        <Button asChild>
          <Link to="/rubrics/new">
            <Plus className="mr-2 h-4 w-4" /> 新增評分標準
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rubrics.map((rubric: Rubric) => (
          <Card key={rubric.id} className="h-full">
            <CardHeader>
              <CardTitle>{rubric.name}</CardTitle>
              <CardDescription>{rubric.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">評分項目:</span>
                  <span>{rubric.criteria?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">創建時間:</span>
                  <span>{format(new Date(rubric.createdAt), 'yyyy-MM-dd')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">更新時間:</span>
                  <span>{format(new Date(rubric.updatedAt), 'yyyy-MM-dd')}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/rubrics/${rubric.id}`}>查看</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/rubrics/${rubric.id}/edit`}>編輯</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
} 