import React from 'react';
import type { SupplierFilterState } from '../../types';
import { Search, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';

interface SupplierFiltersProps {
  filters: SupplierFilterState;
  cities: string[];
  totalCount: number;
  onChange: (key: keyof SupplierFilterState, value: string) => void;
  onReset: () => void;
}

export const SupplierFilters: React.FC<SupplierFiltersProps> = ({
  filters,
  cities,
  totalCount,
  onChange,
  onReset,
}) => {
  const isFiltered =
    filters.search !== '' ||
    filters.status !== 'All' ||
    filters.city !== 'All' ||
    filters.sortBy !== 'id';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Search Bar & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Filter & Search Suppliers
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
            {totalCount} {totalCount === 1 ? 'supplier' : 'suppliers'} matching
          </span>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by code, supplier name, contact, email..."
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onChange('search', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 font-medium"
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {/* Status */}
        <div>
          <label htmlFor="filter-supplier-status" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Supplier Status
          </label>
          <select
            id="filter-supplier-status"
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Suppliers</option>
            <option value="Inactive">Inactive Suppliers</option>
          </select>
        </div>

        {/* City Location */}
        <div>
          <label htmlFor="filter-supplier-city" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            City Location
          </label>
          <select
            id="filter-supplier-city"
            value={filters.city}
            onChange={(e) => onChange('city', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="All">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting & Order */}
        <div>
          <label htmlFor="filter-supplier-sort" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Sort By</span>
            <button
              type="button"
              onClick={() => onChange('order', filters.order === 'ASC' ? 'DESC' : 'ASC')}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="Toggle sorting direction"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{filters.order === 'ASC' ? 'Ascending' : 'Descending'}</span>
            </button>
          </label>
          <select
            id="filter-supplier-sort"
            value={filters.sortBy}
            onChange={(e) => onChange('sortBy', e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="id">Default (ID)</option>
            <option value="code">Supplier Code</option>
            <option value="name">Supplier Name (A-Z)</option>
            <option value="total_orders">Total Orders Count</option>
            <option value="total_value">Total Value ($)</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips & Clear */}
      {isFiltered && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mr-1">
              Active Filters:
            </span>
            {filters.search && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200">
                Search: "{filters.search}"
              </span>
            )}
            {filters.status !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                Status: {filters.status}
              </span>
            )}
            {filters.city !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-xs border border-teal-200">
                City: {filters.city}
              </span>
            )}
            {filters.sortBy !== 'id' && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs border border-purple-200">
                Sorted by: {filters.sortBy} ({filters.order})
              </span>
            )}
          </div>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
