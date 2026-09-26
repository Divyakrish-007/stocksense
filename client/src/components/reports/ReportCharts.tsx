import React from 'react';

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────
interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  title: string;
  items: BarChartItem[];
  formatValue?: (v: number) => string;
  maxBars?: number;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  items,
  formatValue = (v) => v.toLocaleString(),
  maxBars = 8,
}) => {
  const data = items.slice(0, maxBars);
  const max = Math.max(...data.map((d) => d.value), 1);

  const colors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500',
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No data available</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600 truncate max-w-[60%]">{item.label}</span>
                <span className="text-xs font-bold text-slate-800">{formatValue(item.value)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${item.color || colors[idx % colors.length]}`}
                  style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Vertical Bar Chart (for monthly data) ────────────────────────────────────
interface VerticalBarData {
  label: string;
  value: number;
}

interface VerticalBarChartProps {
  title: string;
  data: VerticalBarData[];
  color?: string;
  formatValue?: (v: number) => string;
}

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  title,
  data,
  color = 'bg-blue-500',
  formatValue = (v) => `$${v.toLocaleString()}`,
}) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 160;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No data available</p>
      ) : (
        <div className="flex items-end gap-2 pt-2" style={{ height: chartHeight + 40 }}>
          {data.map((item, idx) => {
            const barHeight = Math.max((item.value / max) * chartHeight, 4);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group" style={{ minWidth: 0 }}>
                <span className="text-[9px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatValue(item.value)}
                </span>
                <div
                  className={`w-full rounded-t-md ${color} transition-all duration-300 hover:opacity-80`}
                  style={{ height: barHeight }}
                  title={`${item.label}: ${formatValue(item.value)}`}
                />
                <span className="text-[9px] font-medium text-slate-500 whitespace-nowrap">{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────
interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  items: DonutItem[];
  centerLabel?: string;
  centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  items,
  centerLabel,
  centerValue,
}) => {
  const total = items.reduce((sum, it) => sum + it.value, 0);
  const radius = 58;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
      {total === 0 ? (
        <p className="text-xs text-slate-400 italic">No data available</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <svg width="144" height="144" viewBox="0 0 144 144">
              {items.map((item, idx) => {
                const pct = item.value / total;
                const dashLength = pct * circumference;
                const dashOffset = -accumulatedAngle * circumference;
                accumulatedAngle += pct;
                return (
                  <circle
                    key={idx}
                    cx="72"
                    cy="72"
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 72 72)"
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            {centerValue !== undefined && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-800">{centerValue}</span>
                {centerLabel && (
                  <span className="text-[10px] font-medium text-slate-500">{centerLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-600 truncate">{item.label}</span>
                <span className="text-xs font-bold text-slate-800 ml-auto">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Comparison Bar (side-by-side) ────────────────────────────────────────────
interface ComparisonBarProps {
  title: string;
  leftLabel: string;
  leftValue: number;
  leftColor: string;
  rightLabel: string;
  rightValue: number;
  rightColor: string;
  formatValue?: (v: number) => string;
}

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  title,
  leftLabel,
  leftValue,
  leftColor,
  rightLabel,
  rightValue,
  rightColor,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const max = Math.max(leftValue, rightValue, 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">{leftLabel}</span>
            <span className="text-xs font-bold text-slate-800">{formatValue(leftValue)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${leftColor}`}
              style={{ width: `${Math.max((leftValue / max) * 100, 2)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">{rightLabel}</span>
            <span className="text-xs font-bold text-slate-800">{formatValue(rightValue)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${rightColor}`}
              style={{ width: `${Math.max((rightValue / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
