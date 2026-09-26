import React from 'react';
import type { DocumentType } from '../../types';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';

interface TypeBadgeProps {
  type: DocumentType | string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const configs: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    Receipts: {
      label: 'Receipt',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      text: 'text-indigo-700',
      icon: <ArrowDownLeft className="w-3.5 h-3.5 text-indigo-600" />,
    },
    Delivery: {
      label: 'Delivery',
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      text: 'text-purple-700',
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />,
    },
    Internal: {
      label: 'Internal',
      bg: 'bg-teal-50 text-teal-700 border-teal-200',
      text: 'text-teal-700',
      icon: <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />,
    },
    Adjustments: {
      label: 'Adjustment',
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      text: 'text-orange-700',
      icon: <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />,
    },
  };

  const current = configs[type] || configs.Receipts;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${current.bg}`}
    >
      {current.icon}
      <span>{type}</span>
    </span>
  );
};
