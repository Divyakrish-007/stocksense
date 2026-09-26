import React from 'react';
import type { PurchaseOrderStatus } from '../../types';
import { Clock, CheckCircle2, AlertCircle, FileText, PackageCheck, XCircle } from 'lucide-react';

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const PurchaseOrderStatusBadge: React.FC<PurchaseOrderStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const normalized = status as PurchaseOrderStatus;

  const styles: Record<
    string,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    Draft: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <FileText className="w-3.5 h-3.5 text-slate-500" />,
      label: 'Draft',
    },
    Waiting: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
      label: 'Waiting Approval',
    },
    Ready: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-blue-600" />,
      label: 'Ready / Dispatched',
    },
    Done: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'Done (Completed)',
    },
    Received: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'Received',
    },
    Approved: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />,
      label: 'Approved',
    },
    Ordered: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />,
      label: 'Ordered',
    },
    'Partially Received': {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
      icon: <Clock className="w-3.5 h-3.5 text-teal-600" />,
      label: 'Partially Received',
    },
    Canceled: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
      label: 'Canceled',
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
