import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Button } from "~/components/ui/button";
import { DashboardPreview } from "~/components/DashboardPreview";


export const meta: MetaFunction = () => {
  return [
    { title: "評分系統" },
    { name: "description", content: "專業的教育評分管理平台" },
  ];
};

export default function Index() {
  const features = [
    {
      title: "智慧評分",
      description: "精準的AI輔助評分系統",
      icon: (
        <svg className="w-6 h-6 text-[#2A4858]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "數據分析",
      description: "全方位的學習成效追蹤",
      icon: (
        <svg className="w-6 h-6 text-[#2A4858]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: "即時回饋",
      description: "快速有效的溝通橋樑",
      icon: (
        <svg className="w-6 h-6 text-[#2A4858]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F7FA] to-white">
      {/* Hero Section */}
      <div className="pt-16 pb-12 sm:pt-20 sm:pb-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#2A4858] sm:text-5xl">
              智慧教育評分系統
            </h1>
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="mt-4 text-lg text-[#5C798F] cursor-help">
                  為現代教育打造的專業評分解決方案
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">智能評分系統特點</h4>
                  <p className="text-sm">
                    AI輔助評分、即時數據分析、個人化學習追蹤，全方位提升教學效率。
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild variant="default" className="bg-[#2A4858] hover:bg-[#1C3D4D]">
                <Link to="/assignments/grade">馬上體驗</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#2A4858] text-[#2A4858]">
                <Link to="/about">了解更多</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-[#F5F7FA]">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-[#F5F7FA] flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-[#2A4858]">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#5C798F]">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="py-16 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#2A4858]">
              智能評分系統預覽
            </h2>
            <p className="mt-4 text-lg text-[#5C798F]">
              體驗實時評分和數據分析功能
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <DashboardPreview />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-[#2A4858]">
                系統成效
              </CardTitle>
              <CardDescription className="text-[#5C798F]">
                實際數據證明的效能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-[#2A4858]">98%</div>
                  <div className="mt-2 text-[#5C798F]">準確率</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#2A4858]">50%</div>
                  <div className="mt-2 text-[#5C798F]">時間節省</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#2A4858]">200+</div>
                  <div className="mt-2 text-[#5C798F]">活躍用戶</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="teachers" className="w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#2A4858] mb-4">使用者回饋</h2>
              <TabsList className="inline-flex">
                <TabsTrigger value="teachers">教師評價</TabsTrigger>
                <TabsTrigger value="students">學生回饋</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="teachers">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-[#2A4858] mb-4">
                      "大幅提升評分效率與準確度"
                    </p>
                    <div className="text-[#5C798F] font-medium">王老師</div>
                    <div className="text-sm text-[#8195A7]">資深教師</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-[#2A4858] mb-4">
                      "完整的數據分析助於教學調整"
                    </p>
                    <div className="text-[#5C798F] font-medium">李老師</div>
                    <div className="text-sm text-[#8195A7]">教學主任</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="students">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-[#2A4858] mb-4">
                      "即時回饋幫助快速改進"
                    </p>
                    <div className="text-[#5C798F] font-medium">張同學</div>
                    <div className="text-sm text-[#8195A7]">高中生</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-[#2A4858] mb-4">
                      "清晰的進度追蹤很有幫助"
                    </p>
                    <div className="text-[#5C798F] font-medium">林同學</div>
                    <div className="text-sm text-[#8195A7]">高中生</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-[#F5F7FA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-[#2A4858]">
                開始使用專業的評分系統
              </CardTitle>
              <CardDescription className="text-[#5C798F]">
                立即體驗智能評分系統
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="bg-[#2A4858] hover:bg-[#1C3D4D]">
                <Link to="/assignments/grade">立即開始</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}