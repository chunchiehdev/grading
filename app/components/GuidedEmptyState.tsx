import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderPlus, 
  FileText, 
  ArrowRight, 
  CheckCircle2,
  Lightbulb,
  Target
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface GuidedEmptyStateProps {
  type: 'categories' | 'criteria' | 'levels';
  onAction: () => void;
  currentStep?: number;
  totalSteps?: number;
}

export const GuidedEmptyState = ({ 
  type, 
  onAction, 
  currentStep = 1, 
  totalSteps = 3 
}: GuidedEmptyStateProps) => {
  const getContent = () => {
    switch (type) {
      case 'categories':
        return {
          title: "開始建立您的評分標準",
          description: "評分標準讓您能夠客觀、一致地評估學生作業。讓我們從建立第一個評分類別開始。",
          actionLabel: "建立第一個類別",
          icon: <FolderPlus className="w-12 h-12" />,
          tips: [
            "常見類別：思維探究、溝通表達、創意發想",
            "每個類別可以包含多個評分標準",
            "建議先規劃好所有類別再添加詳細標準"
          ],
          examples: ["學術寫作", "程式設計", "簡報技巧"]
        };
      
      case 'criteria':
        return {
          title: "為此類別添加評分標準",
          description: "評分標準是具體的評估項目，每個標準都有四個等級的詳細描述。",
          actionLabel: "新增第一個標準",
          icon: <FileText className="w-12 h-12" />,
          tips: [
            "標準應該明確、可測量",
            "避免主觀性太強的描述",
            "每個標準都有 1-4 分的等級"
          ],
          examples: ["論點清晰度", "邏輯結構", "引用正確性"]
        };
        
      case 'levels':
        return {
          title: "設定等級描述",
          description: "為每個評分等級提供清楚的描述，這將幫助評分者做出一致的判斷。",
          actionLabel: "開始編輯等級",
          icon: <Target className="w-12 h-12" />,
          tips: [
            "4分：超越期望的優秀表現",
            "3分：符合期望的良好表現", 
            "2分：基本達到要求",
            "1分：需要改進的表現"
          ],
          examples: ["具體行為描述", "質量標準", "完成度要求"]
        };
    }
  };

  const content = getContent();
  
  const steps: Step[] = [
    {
      id: 'categories',
      title: '建立類別',
      description: '組織評分標準',
      icon: <FolderPlus className="w-4 h-4" />,
      completed: type !== 'categories'
    },
    {
      id: 'criteria', 
      title: '新增標準',
      description: '定義評分項目',
      icon: <FileText className="w-4 h-4" />,
      completed: type === 'levels'
    },
    {
      id: 'levels',
      title: '設定等級',
      description: '描述評分標準',
      icon: <Target className="w-4 h-4" />,
      completed: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="border-2 border-dashed border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">建立進度</h3>
            <Badge variant="outline">
              步驟 {currentStep}/{totalSteps}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  step.completed 
                    ? 'bg-primary text-primary-foreground' 
                    : index === currentStep - 1
                    ? 'bg-primary/10 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                </div>
                
                <div className="ml-2 hidden sm:block">
                  <div className="text-xs font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mx-3" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="text-center">
        <CardContent className="p-12">
          <div className="text-primary/50 mb-6">
            {content.icon}
          </div>
          
          <h2 className="text-xl font-semibold mb-3">{content.title}</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
            {content.description}
          </p>
          
          <Button onClick={onAction} size="lg" className="mb-8">
            {content.actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {/* Tips Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">實用建議</span>
            </div>
            
            <div className="space-y-2 text-left max-w-sm mx-auto">
              {content.tips.map((tip, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div className="mt-6 pt-4 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">常見範例：</div>
            <div className="flex flex-wrap justify-center gap-2">
              {content.examples.map((example, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 