/**
 * Overview Cards Component
 * 
 * Display summary statistics in architectural sketch style cards
 */

import { TrendingUp, FileText, Zap } from 'lucide-react';

interface OverviewData {
  totalChatSessions: number;
  totalGradingSessions: number;
  totalTokensUsed: number;
}

export function OverviewCards({ data }: { data: OverviewData }) {
  const cards = [
    {
      title: 'Chat Sessions',
      value: data.totalChatSessions.toLocaleString(),
      icon: TrendingUp,
      description: 'Total agent conversations',
    },
    {
      title: 'Grading Sessions',
      value: data.totalGradingSessions.toLocaleString(),
      icon: FileText,
      description: 'Completed AI gradings',
    },
    {
      title: 'Tokens Used',
      value: formatTokens(data.totalTokensUsed),
      icon: Zap,
      description: 'Total API consumption',
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="group relative overflow-hidden rounded-sm border-2 border-[#2B2B2B] bg-white p-6 shadow-sm transition-all hover:shadow-md"
          style={{
            transform: `rotate(${index % 2 === 0 ? '0.3deg' : '-0.3deg'})`,
          }}
        >
          {/* Subtle secondary border for sketch effect */}
          <div className="pointer-events-none absolute inset-0 rounded-sm border-2 border-[#2B2B2B]/20" style={{ transform: 'rotate(0.5deg)' }} />

          <div className="relative">
            {/* Icon */}
            <div className="mb-4 inline-flex rounded-full bg-[#D2691E]/10 p-3">
              <card.icon className="h-6 w-6 text-[#D2691E]" strokeWidth={1.5} />
            </div>

            {/* Value */}
            <div className="mb-1 font-serif text-4xl font-light text-[#2B2B2B]">
              {card.value}
            </div>

            {/* Title */}
            <div className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-600">
              {card.title}
            </div>

            {/* Description */}
            <div className="text-xs text-gray-500">{card.description}</div>

            {/* Organic accent line */}
            <svg
              className="absolute -right-4 -top-4 opacity-10"
              width="100"
              height="100"
              viewBox="0 0 100 100"
            >
              <path
                d="M 10 50 Q 30 30, 50 50 T 90 50"
                stroke="#D2691E"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
