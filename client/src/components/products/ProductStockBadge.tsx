import React from 'react';
import type { ProductStatus } from '../../types';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface ProductStockBadgeProps {
  status: ProductStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const ProductStockBadge: React.FC<ProductStockBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const normalized = status as ProductStatus;

  const styles: Record<
    ProductStatus,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    'In Stock': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'In Stock',
    },
    'Low Stock': {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
      label: 'Low Stock',
    },
    'Out of Stock': {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600 animate-pulse" />,
      label: 'Out of Stock',
    },
  };

  const current = styles[normalized] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: null,
    label: status,
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-xs ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
};

interface StockLevelIndicatorProps {
  quantity: number;
  minStockLevel: number;
}

export const StockLevelIndicator: React.FC<StockLevelIndicatorProps> = ({
  quantity,
  minStockLevel,
}) => {
  const isOutOfStock = quantity === 0;
  const isLowStock = !isOutOfStock && quantity <= minStockLevel;

  // Percentage relative to double the minimum stock level for visual bar
  const benchmark = Math.max(minStockLevel * 2, 10);
  const percentage = Math.min(Math.round((quantity / benchmark) * 100), 100);

  let barColor = 'bg-emerald-500';
  let textColor = 'text-slate-900';

  if (isOutOfStock) {
    barColor = 'bg-rose-500';
    textColor = 'text-rose-600 font-bold';
  } else if (isLowStock) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700 font-bold';
  }

  return (
    <div className="space-y-1 min-w-[110px]">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-mono text-sm ${textColor}`}>
          {quantity.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">units</span>
        </span>
        <span className="text-[10px] text-slate-600 font-mono" title={`Safety alert triggered below ${minStockLevel} units`}>
          min: {minStockLevel}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(percentage, isOutOfStock ? 0 : 6)}%` }}
        />
      </div>
    </div>
  );
};
