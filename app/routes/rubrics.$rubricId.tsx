import { LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";
import type { Rubric, RubricCriteria } from "@/types/grading";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const rubricId = params.rubricId;
  
  if (!rubricId) {
    throw new Response("評分標準ID不存在", { status: 404 });
  }
  
  const { getRubric } = await import("@/services/rubric.server");
  const { rubric, error } = await getRubric(rubricId);
  
  if (error || !rubric) {
    console.error("Error loading rubric:", error);
    throw new Response(error || "找不到評分標準", { status: 404 });
  }

  return json({ rubric });
};

export default function RubricDetailRoute() {
  const { rubric } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/rubrics")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回評分標準列表
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{rubric.name}</h1>
        <Button asChild>
          <Link to={`/rubrics/${rubric.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> 編輯評分標準
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">描述</h3>
              <p className="text-muted-foreground">{rubric.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">創建時間</span>
                <p>{format(new Date(rubric.createdAt), 'yyyy-MM-dd HH:mm')}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">更新時間</span>
                <p>{format(new Date(rubric.updatedAt), 'yyyy-MM-dd HH:mm')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>評分標準</CardTitle>
            <CardDescription>總權重: {rubric.totalWeight}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {rubric.criteria.map((criteria: RubricCriteria, index: number) => (
                <div key={criteria.id} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">
                      {index + 1}. {criteria.name}
                    </h3>
                    <span className="text-sm bg-accent text-accent-foreground px-2 py-1 rounded">
                      權重: {criteria.weight}%
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-4">{criteria.description}</p>
                  
                  <h4 className="text-sm font-medium mb-2">評分等級</h4>
                  <div className="space-y-2">
                    {criteria.levels.map((level) => (
                      <div key={level.score} className="flex items-start">
                        <div className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 mr-2">
                          {level.score}分
                        </div>
                        <p className="text-sm">{level.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 