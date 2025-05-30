import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { GradingResultDisplay, type GradingResultData } from './GradingResultDisplay'

interface ResultCarouselItem {
  id: string;
  title: string;
  fileName: string;
  rubricName: string;
  result: GradingResultData;
}

interface ResultCarouselProps {
  results: ResultCarouselItem[];
}

export function ResultCarousel({ results }: ResultCarouselProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        沒有評分結果
      </div>
    );
  }

  return (
    <Carousel className="w-full max-w-5xl mx-auto">
      <CarouselContent>
        {results.map((resultItem, index) => (
          <CarouselItem key={resultItem.id}>
            <div className="p-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="text-center border-b pb-4">
                    <h2 className="text-xl font-bold">{resultItem.fileName}</h2>
                    <p className="text-sm text-muted-foreground">評分標準: {resultItem.rubricName}</p>
                    <p className="text-xs text-muted-foreground">結果 {index + 1} / {results.length}</p>
                  </div>
                  <GradingResultDisplay result={resultItem.result} />
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
} 