import React from 'react';
import type { InventoryAdjustmentFilterState, Warehouse } from '../../types';
import { Search, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';

interface InventoryAdjustmentFiltersProps {
  filters: InventoryAdjustmentFilterState;
  warehouses: Warehouse[];
  totalCount: number;
  onChange: (key: keyof InventoryAdjustmentFilterState, value: string) => void;
  onReset: () => void;
}

const STATUSES = ['All', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
const TYPES = ['All', 'Increase', 'Decrease', 'Set'];

export const InventoryAdjustmentFilters: React.FC<InventoryAdjustmentFiltersProps> = ({
  filters,
  warehouses,
  totalCount,
  onChange,
  onReset,
}) => {
  const isFiltered =
    filters.search !== '' ||
    filters.status !== 'All' ||
    filters.warehouse !== 'All' ||
    filters.adjustmentType !== 'All' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sortBy !== 'id';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Filter Inventory Adjustments
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
            {totalCount} {totalCount === 1 ? 'adjustment' : 'adjustments'} found
          </span>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by ref, reason, warehouse, notes..."
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onChange('search', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
        {/* Status */}
        <div>
          <label htmlFor="iaf-status" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            id="iaf-status"
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Warehouse */}
        <div>
          <label htmlFor="iaf-wh" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Warehouse
          </label>
          <select
            id="iaf-wh"
            value={filters.warehouse}
            onChange={(e) => onChange('warehouse', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="All">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        {/* Adjustment Type */}
        <div>
          <label htmlFor="iaf-type" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Adjustment Type
          </label>
          <select
            id="iaf-type"
            value={filters.adjustmentType}
            onChange={(e) => onChange('adjustmentType', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'All' ? 'All Types' : t}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label htmlFor="iaf-from" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Date From
          </label>
          <div className="relative">
            <input
              id="iaf-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Date To */}
        <div>
          <label htmlFor="iaf-to" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Date To
          </label>
          <div className="relative">
            <input
              id="iaf-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label htmlFor="iaf-sort" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Sort By
          </label>
          <div className="flex gap-1">
            <select
              id="iaf-sort"
              value={filters.sortBy}
              onChange={(e) => onChange('sortBy', e.target.value)}
              className="flex-1 px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="id">Latest Added</option>
              <option value="reference">Reference</option>
              <option value="warehouse_code">Warehouse</option>
              <option value="reason">Reason</option>
              <option value="adjustment_type">Type</option>
              <option value="created_at">Date</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => onChange('order', filters.order === 'ASC' ? 'DESC' : 'ASC')}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title={`Toggle Sort Order (Current: ${filters.order})`}
              aria-label="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Reset Bar */}
      {isFiltered && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Active filters applied. Showing matching adjustments.</span>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
};
