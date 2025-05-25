import { useNavigate } from 'react-router';
import { ArrowRight, BookOpen, GraduationCap, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@/hooks/useAuth';

const features = [
  {
    title: '智能評分',
    description: '利用 AI 技術輔助評分，提高評分效率和準確性',
    icon: FileText,
  },
  {
    title: '多人協作',
    description: '支持多位教師同時評分，實時同步評分結果',
    icon: Users,
  },
  {
    title: '學習分析',
    description: '提供詳細的學習分析報告，幫助教師了解學生學習狀況',
    icon: BookOpen,
  },
  {
    title: '教學改進',
    description: '基於評分數據提供教學改進建議，提升教學質量',
    icon: GraduationCap,
  },
];

/**
 * Hero Section
 * Using React Query get user status
 */
const HeroSection = () => {
  const navigate = useNavigate();

  const { data: user, isLoading } = useUser();
  const isLoggedIn = Boolean(user);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">教育評分系統</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            使用現代科技輔助教學評量，提升教學效能，讓評分更智能、更高效
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={handleGetStarted} className="gap-2" disabled={isLoading}>
              {isLoggedIn ? '進入系統' : '開始使用'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!isLoggedIn && !isLoading && (
              <Button variant="outline" size="lg" onClick={() => navigate('/auth/login')}>
                登入
              </Button>
            )}
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export { HeroSection };
