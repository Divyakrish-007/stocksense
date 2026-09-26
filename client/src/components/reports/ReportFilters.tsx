import React from 'react';
import type { ReportTab } from '../../types';
import { Calendar, RotateCcw, Warehouse } from 'lucide-react';

interface ReportFiltersProps {
  dateFrom: string;
  dateTo: string;
  warehouse: string;
  activeTab: ReportTab;
  warehouses: { code: string; name: string }[];
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onWarehouseChange: (v: string) => void;
  onTabChange: (tab: ReportTab) => void;
  onReset: () => void;
}

const tabs: { key: ReportTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'sales', label: 'Sales' },
  { key: 'movements', label: 'Movements' },
  { key: 'warehouses', label: 'Warehouses' },
];

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  dateFrom,
  dateTo,
  warehouse,
  activeTab,
  warehouses,
  onDateFromChange,
  onDateToChange,
  onWarehouseChange,
  onTabChange,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date From */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
            placeholder="From"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
            placeholder="To"
          />
        </div>

        {/* Warehouse (for inventory tab) */}
        {(activeTab === 'inventory' || activeTab === 'overview') && (
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-slate-400" />
            <select
              value={warehouse}
              onChange={(e) => onWarehouseChange(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
            >
              <option value="All">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.code} value={wh.code}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
};
