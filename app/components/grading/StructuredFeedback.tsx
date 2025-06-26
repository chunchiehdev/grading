import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Target, ArrowRight, FileText } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'

import { OverallFeedbackStructured } from '@/types/grading';

interface StructuredFeedbackProps {
    feedback: string | OverallFeedbackStructured;
    className?: string;
}

/**
 * 智能回饋組件 - 根據資料類型自動選擇最佳呈現方式
 */
export function StructuredFeedback({ feedback, className }: StructuredFeedbackProps) {
    // 如果是字串，使用 Markdown 渲染
    if (typeof feedback === 'string') {
        return (
            <div className={className}>
                <Markdown>{feedback}</Markdown>
            </div>
        );
    }

    // 如果是結構化資料，使用專門的樣式
    const { documentStrengths, keyImprovements, nextSteps, summary } = feedback;

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {/* 總結 */}
            {summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-blue-900">總體評價</h4>
                    </div>
                    <p className="text-blue-800 text-sm leading-relaxed">{summary}</p>
                </div>
            )}

            {/* 優點 */}
            {documentStrengths && documentStrengths.length > 0 && (
                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-green-800 flex items-center gap-2 text-base">
                            <CheckCircle className="h-4 w-4" />
                            表現優點
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {documentStrengths.length} 項
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {documentStrengths.map((strength, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs font-medium rounded-full flex items-center justify-center mt-0.5">
                                        {index + 1}
                                    </span>
                                    <span className="text-green-800 text-sm leading-relaxed">
                                        {strength}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* 改進建議 */}
            {keyImprovements && keyImprovements.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-orange-800 flex items-center gap-2 text-base">
                            <Target className="h-4 w-4" />
                            改進重點
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                {keyImprovements.length} 項
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {keyImprovements.map((improvement, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 bg-orange-600 text-white text-xs font-medium rounded-full flex items-center justify-center mt-0.5">
                                        {index + 1}
                                    </span>
                                    <span className="text-orange-800 text-sm leading-relaxed">
                                        {improvement}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* 下一步建議 */}
            {nextSteps && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-blue-800 flex items-center gap-2 text-base">
                            <ArrowRight className="h-4 w-4" />
                            下一步建議
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-blue-800 text-sm leading-relaxed">
                            {nextSteps}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/**
 * 簡化版的結構化回饋組件 - 用於緊湊空間
 */
export function CompactStructuredFeedback({ feedback, className }: StructuredFeedbackProps) {
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
                    <strong>總評：</strong> {summary}
                </div>
            )}

            {documentStrengths && documentStrengths.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        優點 ({documentStrengths.length})
                    </h5>
                    <ul className="text-xs space-y-1 pl-4">
                        {documentStrengths.map((strength, index) => (
                            <li key={index} className="text-green-600 list-disc">
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {keyImprovements && keyImprovements.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        改進 ({keyImprovements.length})
                    </h5>
                    <ul className="text-xs space-y-1 pl-4">
                        {keyImprovements.map((improvement, index) => (
                            <li key={index} className="text-orange-600 list-disc">
                                {improvement}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {nextSteps && (
                <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    <strong>建議：</strong> {nextSteps}
                </div>
            )}
        </div>
    );
} 