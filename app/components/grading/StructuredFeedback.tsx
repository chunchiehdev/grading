import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Target, ArrowRight, FileText } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'
import { useTranslation } from 'react-i18next'

import { OverallFeedbackStructured } from '@/types/grading';

interface StructuredFeedbackProps {
    feedback: string | OverallFeedbackStructured;
    className?: string;
}


export function StructuredFeedback({ feedback, className }: StructuredFeedbackProps) {
    const { t } = useTranslation('grading');
    
    if (typeof feedback === 'string') {
        return (
            <div className={className}>
                <Markdown>{feedback}</Markdown>
            </div>
        );
    }

    const { documentStrengths, keyImprovements, nextSteps, summary } = feedback;

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {summary && (
                <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {t('structuredFeedback.overallEvaluation')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
                    </CardContent>
                </Card>
            )}

            {documentStrengths && documentStrengths.length > 0 && (
                <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            {t('structuredFeedback.strengths')}
                        </CardTitle>
                        <Badge variant="secondary">{t('structuredFeedback.itemCount', { count: documentStrengths.length })}</Badge>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 pl-5 list-disc">
                            {documentStrengths.map((strength, index) => (
                                <li key={index} className="text-sm text-muted-foreground leading-relaxed">
                                    {strength}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {keyImprovements && keyImprovements.length > 0 && (
                <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            {t('structuredFeedback.improvements')}
                        </CardTitle>
                        <Badge variant="secondary">{t('structuredFeedback.itemCount', { count: keyImprovements.length })}</Badge>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 pl-5 list-disc">
                            {keyImprovements.map((improvement, index) => (
                                <li key={index} className="text-sm text-muted-foreground leading-relaxed">
                                    {improvement}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {nextSteps && (
                <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            {t('structuredFeedback.nextSteps')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {nextSteps}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


export function CompactStructuredFeedback({ feedback, className }: StructuredFeedbackProps) {
    const { t } = useTranslation('grading');
    
    if (typeof feedback === 'string') {
        return (
            <div className={className}>
                <Markdown className="prose-sm">{feedback}</Markdown>
            </div>
        );
    }

    const { documentStrengths, keyImprovements, nextSteps, summary } = feedback;

    return (
        <div className={`space-y-3 ${className || ''}`}>
            {summary && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    <strong>{t('structuredFeedback.summary')}:</strong> {summary}
                </div>
            )}

            {documentStrengths && documentStrengths.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-muted-foreground" />
                        {t('structuredFeedback.strengthsCount', { count: documentStrengths.length })}
                    </h5>
                    <ul className="text-xs space-y-1 pl-5 list-disc">
                        {documentStrengths.map((strength, index) => (
                            <li key={index} className="text-muted-foreground">
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {keyImprovements && keyImprovements.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        {t('structuredFeedback.improvementsCount', { count: keyImprovements.length })}
                    </h5>
                    <ul className="text-xs space-y-1 pl-5 list-disc">
                        {keyImprovements.map((improvement, index) => (
                            <li key={index} className="text-muted-foreground">
                                {improvement}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {nextSteps && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <strong>{t('structuredFeedback.suggestions')}:</strong> {nextSteps}
                </div>
            )}
        </div>
    );
} 
