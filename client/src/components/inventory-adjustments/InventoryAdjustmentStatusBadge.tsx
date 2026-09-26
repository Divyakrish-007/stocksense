import React from 'react';
import type { InventoryAdjustmentStatus } from '../../types';

interface InventoryAdjustmentStatusBadgeProps {
  status: InventoryAdjustmentStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Done:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  Ready:    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200'    },
  Waiting:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200'   },
  Draft:    { bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-200'   },
  Canceled: { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    border: 'border-rose-200'    },
};

export const InventoryAdjustmentStatusBadge: React.FC<InventoryAdjustmentStatusBadgeProps> = ({ status, size = 'md' }) => {
  const key = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Draft';
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.Draft;
  const sz  = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${sz}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {key}
    </span>
  );
};
