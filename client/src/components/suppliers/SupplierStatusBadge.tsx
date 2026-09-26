import React from 'react';
import type { SupplierStatus } from '../../types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface SupplierStatusBadgeProps {
  status: SupplierStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const SupplierStatusBadge: React.FC<SupplierStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const isInactive = status === 'Inactive';

  const current = isInactive
    ? {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
        label: 'Inactive',
      }
    : {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        label: 'Active',
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
