import React from 'react';
import type { InventoryAdjustmentType } from '../../types';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface InventoryAdjustmentTypeBadgeProps {
  type: InventoryAdjustmentType | string;
  size?: 'sm' | 'md';
}

const TYPE_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
> = {
  Increase: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: 'Increase (+)',
  },
  Decrease: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    label: 'Decrease (-)',
  },
  Set: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: <Target className="w-3.5 h-3.5" />,
    label: 'Set Target (=)',
  },
};

export const InventoryAdjustmentTypeBadge: React.FC<InventoryAdjustmentTypeBadgeProps> = ({
  type,
  size = 'md',
}) => {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.Increase;
  const sz = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} ${sz}`}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
};
