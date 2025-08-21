// FeedbackDisplay.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ClipboardCheck, FileText, MessageCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type StrengthVariant = 'success' | 'info' | 'warning';
interface FeedbackDisplayProps {
  feedback?: string | any;
  onClose?: () => void;
  className?: string;
}

const EmptyFeedbackState = () => {
  const { t } = useTranslation('grading');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const features = [
    {
      icon: ClipboardCheck,
      title: t('feedbackUi.features.detailedFeedback'),
      description: t('feedbackUi.features.detailedFeedbackDesc'),
    },
    {
      icon: FileText,
      title: t('feedbackUi.features.gradingCriteria'),
      description: t('feedbackUi.features.gradingCriteriaDesc'),
    },
    {
      icon: MessageCircle,
      title: t('feedbackUi.features.suggestions'),
      description: t('feedbackUi.features.suggestionsDesc'),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-6">
        <Star className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('feedbackUi.empty.title')}</h3>
      <p className="text-gray-600 mb-8">{t('feedbackUi.empty.subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="relative"
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() => setHoveredIndex(null)}
          >
            <Card className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <feature.icon className="w-6 h-6 text-gray-600" />
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <AnimatePresence>
              {hoveredIndex === index && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute -right-2 top-1/2 -translate-y-1/2"
                >
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function FeedbackDisplay({ feedback, onClose, className }: FeedbackDisplayProps) {
  const { t } = useTranslation('common');
  if (!feedback) {
    return <EmptyFeedbackState />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="feedback-content">{typeof feedback === 'string' ? feedback : JSON.stringify(feedback)}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('close')}
        </button>
      )}
    </div>
  );
}
