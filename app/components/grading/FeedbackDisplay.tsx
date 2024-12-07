// app/components/grading/FeedbackDisplay.tsx
import type { FeedbackData } from "~/types/grading";
import { 
    StarIcon,
    MagnifyingGlassIcon,
    Pencil2Icon,
    CheckCircledIcon 
  } from "@radix-ui/react-icons";

interface FeedbackDisplayProps {
  feedback?: FeedbackData;
}

function FeedbackSection({ 
  title, 
  comments, 
  strengths, 
  bgColor = "bg-green-100" 
}: { 
  title: string; 
  comments: string; 
  strengths: string[]; 
  bgColor?: string; 
}) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-blue-700 mb-2">{title}</h3>
      <p className="text-gray-700 mb-3">{comments}</p>
      <div className="flex flex-wrap gap-2">
        {strengths.map((strength, index) => (
          <span
            key={index}
            className={`${bgColor} text-gray-800 px-3 py-1 rounded-full text-sm`}
          >
            {strength}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeedbackDisplay({ feedback }: FeedbackDisplayProps) {
  if (!feedback) {
    return <EmptyFeedbackState />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold">評分結果</h2>
        <StarIcon className="w-5 h-5 text-blue-600 ml-2" />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center">
        <span className="text-4xl font-semibold text-gray-800">
          {feedback.score}/100
        </span>
      </div>

      <FeedbackSection
        title="摘要部分"
        comments={feedback.summaryComments}
        strengths={feedback.summaryStrengths}
        bgColor="bg-green-100"
      />

      <FeedbackSection
        title="反思部分"
        comments={feedback.reflectionComments}
        strengths={feedback.reflectionStrengths}
        bgColor="bg-blue-100"
      />

      <FeedbackSection
        title="問題部分"
        comments={feedback.questionComments}
        strengths={feedback.questionStrengths}
        bgColor="bg-yellow-100"
      />

      <div>
        <h3 className="text-lg font-semibold text-blue-700 mb-2">整體建議</h3>
        <p className="text-gray-700">{feedback.overallSuggestions}</p>
      </div>
    </div>
  );
}

function EmptyFeedbackState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-8">
      <div className="flex gap-4">
        {[MagnifyingGlassIcon, Pencil2Icon, CheckCircledIcon].map((Icon, index) => (
          <div
            key={index}
            className="w-20 h-20 border-2 border-black bg-gray-100 rounded-lg flex items-center justify-center transition-all duration-300"
          >
            <Icon className="w-10 h-10 text-gray-500" />
          </div>
        ))}
      </div>
      <p className="text-gray-600 tracking-wide font-normal">
        請輸入作業內容開始評分
      </p>
    </div>
  );
}

