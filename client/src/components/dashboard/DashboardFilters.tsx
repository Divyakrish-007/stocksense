import React from 'react';
import type { DashboardFilterState, FilterOptions } from '../../types';
import { Search, RotateCcw, Filter } from 'lucide-react';

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  options: FilterOptions;
  onChange: (key: keyof DashboardFilterState, value: string) => void;
  onReset: () => void;
  totalFiltered: number;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  options,
  onChange,
  onReset,
  totalFiltered,
}) => {
  const isFiltered =
    filters.type !== 'All' ||
    filters.status !== 'All' ||
    filters.warehouse !== 'All' ||
    filters.category !== 'All' ||
    filters.search !== '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Inventory Activity Filters
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {totalFiltered} records matching
          </span>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search ref, partner, route..."
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onChange('search', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* 1. Document Type */}
        <div>
          <label htmlFor="filter-type" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Document Type
          </label>
          <select
            id="filter-type"
            value={filters.type}
            onChange={(e) => onChange('type', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="All">All Document Types</option>
            {options.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Status */}
        <div>
          <label htmlFor="filter-status" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {options.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Warehouse / Location */}
        <div>
          <label htmlFor="filter-wh" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Warehouse / Location
          </label>
          <select
            id="filter-wh"
            value={filters.warehouse}
            onChange={(e) => onChange('warehouse', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="All">All Warehouses</option>
            {options.warehouses.map((wh) => (
              <option key={wh.code} value={wh.code}>
                {wh.code} - {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Product Category */}
        <div>
          <label htmlFor="filter-cat" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Product Category
          </label>
          <select
            id="filter-cat"
            value={filters.category}
            onChange={(e) => onChange('category', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="All">All Categories</option>
            {options.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Tags & Reset */}
      {isFiltered && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mr-1">
              Active:
            </span>
            {filters.type !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                Type: {filters.type}
              </span>
            )}
            {filters.status !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs border border-amber-200">
                Status: {filters.status}
              </span>
            )}
            {filters.warehouse !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-xs border border-teal-200">
                WH: {filters.warehouse}
              </span>
            )}
            {filters.category !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs border border-purple-200">
                Cat: {filters.category}
              </span>
            )}
            {filters.search && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200">
                Keyword: "{filters.search}"
              </span>
            )}
          </div>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
