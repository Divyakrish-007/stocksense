import React from 'react';

interface KpiCardData {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
}

interface ReportKpiCardsProps {
  cards: KpiCardData[];
  isLoading?: boolean;
}

export const ReportKpiCards: React.FC<ReportKpiCardsProps> = ({ cards, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-20 h-3 bg-slate-200 rounded"></div>
              <div className="w-9 h-9 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="w-16 h-7 bg-slate-200 rounded mt-3"></div>
            <div className="w-28 h-3 bg-slate-200 rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </span>
            <div className={`p-2 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</span>
          </div>
          {card.subtext && (
            <p className="mt-1 text-[11px] text-slate-500 font-medium">{card.subtext}</p>
          )}
        </div>
      ))}
    </div>
  );
};
