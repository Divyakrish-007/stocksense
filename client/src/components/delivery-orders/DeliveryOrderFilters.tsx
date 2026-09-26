import React from 'react';
import type { DeliveryOrderFilterState, Warehouse } from '../../types';
import { Search, RotateCcw, Filter, ArrowUpDown, Calendar } from 'lucide-react';

interface DeliveryOrderFiltersProps {
  filters: DeliveryOrderFilterState;
  warehouses: Warehouse[];
  totalCount: number;
  onChange: (key: keyof DeliveryOrderFilterState, value: string) => void;
  onReset: () => void;
}

const STATUSES = ['All', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

export const DeliveryOrderFilters: React.FC<DeliveryOrderFiltersProps> = ({
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
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sortBy !== 'id';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Filter Delivery Orders
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
            {totalCount} {totalCount === 1 ? 'order' : 'orders'} found
          </span>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by ref, customer, address, notes..."
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
        {/* Status */}
        <div>
          <label htmlFor="dof-status" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            id="dof-status"
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Source Warehouse */}
        <div>
          <label htmlFor="dof-wh" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Source Warehouse
          </label>
          <select
            id="dof-wh"
            value={filters.warehouse}
            onChange={(e) => onChange('warehouse', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.code} value={wh.code}>
                {wh.code} - {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label htmlFor="dof-from" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date From
          </label>
          <input
            id="dof-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Date To */}
        <div>
          <label htmlFor="dof-to" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date To
          </label>
          <input
            id="dof-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange('dateTo', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="dof-sort" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Sort By</span>
            <button
              type="button"
              onClick={() => onChange('order', filters.order === 'ASC' ? 'DESC' : 'ASC')}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3 h-3" />
              {filters.order}
            </button>
          </label>
          <select
            id="dof-sort"
            value={filters.sortBy}
            onChange={(e) => onChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="id">Default (Newest)</option>
            <option value="reference">Reference No.</option>
            <option value="customer">Customer / Partner</option>
            <option value="scheduled_date">Scheduled Date</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {isFiltered && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mr-1">Active:</span>
            {filters.search && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Search: "{filters.search}"
              </span>
            )}
            {filters.status !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Status: {filters.status}
              </span>
            )}
            {filters.warehouse !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                WH: {filters.warehouse}
              </span>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Date: {filters.dateFrom || '…'} → {filters.dateTo || '…'}
              </span>
            )}
          </div>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
};
